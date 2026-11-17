/**
 * Reading and committing files in this site's GitHub repository.
 *
 * Server-side only (Netlify functions). Used by the experience project
 * functions: netlify/functions/create-experience-project.js and
 * netlify/functions/update-experience-project.js.
 *
 * Everything reads from and commits to one branch. Production uses main. A
 * Netlify deploy preview can set GITHUB_BRANCH to its own branch so test
 * uploads never touch main.
 */

const branch = () => process.env.GITHUB_BRANCH || 'main';
const repoUrl = () => `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;
const headers = () => ({
  'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json'
});

// Build an error that says which GitHub step failed and why. GitHub's
// message never contains the token.
async function githubError(action, response, { write = false } = {}) {
  let githubMessage = '';
  try { githubMessage = (await response.json()).message || ''; } catch (e) { /* no JSON body */ }
  const hint = response.status === 401
    ? 'The GitHub token in the site settings is not valid or has expired.'
    : (response.status === 403 || response.status === 404)
      ? (write
        ? 'The GitHub token can read this repository but is not allowed to write to it. It needs read and write access to the repository contents.'
        : `The file was not found on the "${branch()}" branch, or the GitHub token cannot see this repository.`)
      : response.status === 409 || response.status === 422
        ? 'GitHub rejected the change. Someone else may have committed at the same moment. Try again.'
        : 'GitHub could not complete the request.';
  console.error(`[github] Could not ${action}:`, response.status, githubMessage);
  return new Error(`Could not ${action} on GitHub (status ${response.status}${githubMessage ? `: ${githubMessage}` : ''}). ${hint} Nothing was changed.`);
}

/**
 * Read one file from the repository.
 * Returns its text, or null when the file does not exist. Throws when GitHub
 * cannot be read for any other reason.
 */
async function readRepoFile(path) {
  const res = await fetch(`${repoUrl()}/contents/${path}?ref=${encodeURIComponent(branch())}`, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw await githubError(`read ${path}`, res);
  const data = await res.json();
  if (Array.isArray(data)) return null; // a folder, not a file
  if (data.content) return Buffer.from(data.content, 'base64').toString('utf-8');
  // Files over 1 MB come back without content: fetch the raw blob instead
  const blob = await fetch(`${repoUrl()}/git/blobs/${data.sha}`, { headers: headers() });
  if (!blob.ok) throw await githubError(`read ${path}`, blob);
  return Buffer.from((await blob.json()).content, 'base64').toString('utf-8');
}

/** True when a file or folder exists at this path. */
async function repoPathExists(path) {
  const res = await fetch(`${repoUrl()}/contents/${path}?ref=${encodeURIComponent(branch())}`, { headers: headers() });
  if (res.status === 404) return false;
  if (!res.ok) throw await githubError(`check ${path}`, res);
  return true;
}

/**
 * Commit several files in one commit.
 * files: [{ path, content }]. Returns { commitUrl } or { error }.
 */
async function commitToGitHub(files, message) {
  const json = { ...headers(), 'Content-Type': 'application/json' };
  try {
    const refRes = await fetch(`${repoUrl()}/git/refs/heads/${branch()}`, { headers: headers() });
    if (!refRes.ok) throw await githubError('read the branch', refRes);
    const latestCommitSha = (await refRes.json()).object.sha;

    const commitRes = await fetch(`${repoUrl()}/git/commits/${latestCommitSha}`, { headers: headers() });
    if (!commitRes.ok) throw await githubError('read the latest commit', commitRes);
    const baseTreeSha = (await commitRes.json()).tree.sha;

    const treeRes = await fetch(`${repoUrl()}/git/trees`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content }))
      })
    });
    if (!treeRes.ok) throw await githubError('save the files', treeRes, { write: true });
    const treeSha = (await treeRes.json()).sha;

    const newCommitRes = await fetch(`${repoUrl()}/git/commits`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ message, tree: treeSha, parents: [latestCommitSha] })
    });
    if (!newCommitRes.ok) throw await githubError('create the commit', newCommitRes, { write: true });
    const newCommit = await newCommitRes.json();

    const updateRefRes = await fetch(`${repoUrl()}/git/refs/heads/${branch()}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ sha: newCommit.sha })
    });
    if (!updateRefRes.ok) throw await githubError('update the branch', updateRefRes, { write: true });

    return { commitUrl: newCommit.html_url };
  } catch (err) {
    return { error: err.message };
  }
}

export { readRepoFile, repoPathExists, commitToGitHub };
