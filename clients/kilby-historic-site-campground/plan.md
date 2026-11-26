# Kilby Heritage Society: Accelerator Implementation Plan

## Meta
Client Slug: kilby-heritage-society
Has GBP Quick Wins: yes

## Goal

Kilby is running a museum, a working farm, a cafe, and a campground, and it is doing it with one marketing day a week. That context makes the results more impressive: a single post announcing the new breakfast reached about 70,000 people organically, the Facebook following is 5,200, the Google rating is 4.6 stars across 433 reviews, Tourism Harrison partnerships bring in new followers, and locals are returning for the cafe and the rotating workshops. The campground books itself, so the work in this plan is not about filling it. The gap is everything that sits between a person discovering Kilby and a person walking through the door. The WordPress site has been built by many hands over many years, with 257 images on the homepage, a 67 out of 100 speed score, and no clear path to the museum, the cafe, or the campground. There are no Reels on Instagram, engagement sits at 0.3 percent, outdated third-party pages show the wrong information in search, and booking is manual and heavy on admin time. The next ninety days are designed around your calendar. You are open to the public for a few more weeks, so the first two weeks capture content while the animals, the store, and the cafe are in front of you. Then the break begins, and that quiet season is the best time to rebuild the website and write the content that makes AI tools and search engines describe Kilby accurately. By the February campground announcement, which gets your highest email open rate, everything points to a faster and clearer site. The three results you named are the ones this plan is built to move: steady website traffic growth, more social followers, and stronger reach among locals. Every week is sized to fit one day.

## Strategic Positioning

Kilby is one of only 11 provincial heritage properties in BC, and it is the one where children meet the animals, grandparents show them the 1906 general store, and locals come back for breakfast and a butter-making workshop. That combination is the point. A large attraction cannot offer the same warmth, and an OTA cannot describe it. The visitors you serve most, young families, seniors with grandchildren, school groups, and neighbours, are looking for a day out that is affordable, easy, and real, and the people you would like to reach next, younger visitors with limited disposable income, are looking for exactly that. The positioning is a place with 120 years of stories, friendly animals, and a good cafe, open to everyone.

> **Your Strategic Positioning**
> Kilby Historic Site is a 1906 general store, a working farm, and a cafe in Harrison Mills: a day out where kids meet the animals, grandparents share the history, and neighbours come back for breakfast and a workshop. One of BC's 11 provincial heritage properties, and one of the friendliest.

## Welcome Message

You are running a museum, a farm, a cafe, and a campground on one marketing day a week, and a single breakfast post reached 70,000 people. This plan uses the quiet season to fix the website and build the content that will make the next open season easier.

---

## Tactic 1: Website Speed, Clear Calls to Action, and Easier Booking
Phase: Foundation
Short Label: Website & Booking
Subtitle: Make the WordPress site faster and clearer, add calls to action that send visitors to the museum, cafe, and campground, and find a booking option that takes less of your time.

### What We Heard From You

The website is old, was built by several people over time, and is not always intuitive. The assessment found 257 images on the homepage and desktop and mobile speed scores of 67 out of 100, which is a real problem for visitors on rural data connections. The phone number, (604) 796-9576, is present but cannot be tapped, and the Book Now buttons exist but do not stand out. You also told us booking through WooCommerce is manual and heavy on admin, and the assessment found that events and themed dinners depend on TripAdvisor, which means you may be paying commissions and missing customer details. On the call we agreed on two specific fixes: compress and resize the large images, and add a homepage carousel with clear calls to action for the museum, the cafe, and the campground.

### What This Is

Three jobs, in order. The first is speed: find out why the homepage carries so many images, compress and resize them, and switch on lazy loading and caching. The second is clarity: a three-card call-to-action carousel on the homepage, a tap-to-call phone number, and Book and Reserve buttons on the pages where visitors make decisions. The third is booking: map what is slow about the current process and pilot a better option on one event before you commit to a change.

### Why It Matters

A slow page loses people before they read a word, and a page without a clear next step loses the ones who stay. Kilby serves three different audiences from one homepage, and the assessment rated your digital guest experience at 91 out of 100 because the hours, directions, and parking information are there. The information is strong, and the site makes it hard to reach. Everything else in this plan, from social posts to topic clusters, sends people to this website, so it has to be ready for them. Easier booking matters for a different reason: with one marketing day a week, every hour spent processing bookings by hand is an hour not spent on the work that brings people in.

### Implementation Steps

#### Part A: Speed

1. **Find out why the homepage carries 257 images and cut the number down.**
   - Open your homepage in Chrome, right-click, choose Inspect, open the Network tab, filter by Img, and reload the page. Sort by size and note the 20 largest files. You can also run the homepage through PageSpeed Insights (pagespeed.web.dev) and read the sections called "Properly size images" and "Defer offscreen images."
   - Work out what is generating the images. A blog feed, a gallery block, a slider, or a hidden set of thumbnails can add dozens without anyone noticing. A homepage does not need 257 images. Aim for fewer than 40.
   - Move galleries to their own pages, reduce the number of posts shown in any feed on the homepage, and delete sliders you no longer use. Record the new image count and the new PageSpeed score.

2. **Compress and resize the images, and convert them to WebP.**
   - Start with the homepage. Resize each original so the longest edge is about 2,000 pixels for full-width images and 1,200 pixels for images inside the page. WordPress automatically scales down anything wider than 2,560 pixels, which is far larger than your visitors need. Run each image through a free tool such as Squoosh (squoosh.app) or TinyPNG for a first pass at roughly 75 to 80 percent quality.
   - Install one image optimization plugin so new uploads are handled automatically. ShortPixel, Imagify, EWWW Image Optimizer, and Smush are all well-known options, and most can convert images to WebP, a format that reduces file size by about 25 to 35 percent without a visible loss. Check the current free-tier limits before you choose, since some cap the number of images or the total size each month.
   - Keep a backup of the original files. Then run the plugin's bulk optimize on the homepage images first, and on the rest of the media library as the free tier allows.
   - Re-run PageSpeed Insights. The assessment estimates that this step alone can improve the speed score by 20 to 30 points, and the target is 80 or higher.

3. **Check lazy loading and add caching.**
   - WordPress has loaded images lazily by default since version 5.5, which means images below the fold load only as a visitor scrolls. Sliders, page builders, and some plugins switch this off, so check your homepage in PageSpeed Insights. If it still reports offscreen images loading immediately, look at the slider or builder settings for a "lazy load" option and turn it on.
   - Install one caching plugin. WP Super Cache is a free option, and LiteSpeed Cache is the right choice if your host runs LiteSpeed. Ask your host first which caching they already provide, since some include it, and never run two caching plugins at once. Caching also adds the browser caching headers the assessment recommends, so returning visitors do not re-download your images.
   - Test the homepage on your phone using mobile data, not WiFi. That is the experience a visitor on a rural connection has.

#### Part B: Clearer Paths

4. **Build the homepage call-to-action carousel for the museum, cafe, and campground.**
   - Create three slides, one for each part of Kilby, each with one image, one line, and one button. Use compressed images no wider than 1,600 pixels.
   - Museum: a strong photo of the 1906 store, a line such as "Step inside a 1906 general store," and a button that says "Plan Your Visit" linking to your visit page. Cafe: a photo of breakfast or the cafe interior, a line such as "Breakfast, lunch, and dinner nights," and a button that says "See the Menu." Campground: a campsite photo, a line such as "Camp at Kilby," and a button that says "Book a Campsite" linking to the booking page.
   - In WordPress, use the slider or carousel block your theme provides, or a free plugin such as Smart Slider 3. Keep it to three slides with no fast autoplay. If your theme does not have a slider, three side-by-side cards built from the Columns and Cover blocks do the same job and load faster, so they are a good fallback.
   - Make sure the page has one H1 and that each button starts with a verb. Add a "Plan Your Visit" button to the header menu as well, so it is visible on every page.

5. **Add a tap-to-call phone number and clear Book and Reserve buttons.**
   - Make the phone number, (604) 796-9576, a tap-to-call link everywhere it appears. Select the number, click the link icon, and enter tel:+16047969576. Add it to the header or footer of every page, and to the event and contact pages where visitors have booking questions. Seventy percent of tourism traffic is on mobile, and tapping is far easier than copying.
   - On the event pages and the cafe pages, add a button in a contrasting colour that says "Reserve Your Spot" or "Book Your Visit," placed above the fold and again at the end of the page. The assessment estimates that a clearer conversion path can lift booking rates by 15 to 25 percent.
   - Add a "last updated" date next to the hours and admission information on your visit page. It helps visitors trust what they read, and it tells search engines the page is current.

6. **Install analytics and the Meta Pixel, and set up Search Console.**
   - Install Google's Site Kit plugin, which connects Google Analytics 4 and Search Console to WordPress in a guided setup. The assessment recommends GA4 so you can see which social platforms and content drive actual bookings. Search Console also holds up to 16 months of history, which gives you a baseline from before this plan began.
   - Install the Meta Pixel using Meta's official WordPress plugin, or paste the pixel code into the header with a plugin such as WPCode. Confirm it works by installing the Meta Pixel Helper extension for Chrome and visiting your own homepage. The Pixel is what lets your occasional Meta ads learn from real visitors.
   - Mark three actions as key events in GA4: clicks on Book and Reserve buttons, taps on the phone number, and visits to the booking confirmation page. This turns a count of visits into a count of intentions.
   - Add UTM tags to every link you send from the newsletter, Facebook, Instagram, and Google Business Profile. Google's Campaign URL Builder makes this a copy-and-paste job.

#### Part C: Easier Booking

7. **Map your current booking process and shortlist better options.**
   - List every type of booking you take: event tickets, workshops, cafe dinner nights, school groups, and the campground. For each one, write down who handles it, how long it takes in minutes, and what goes wrong. You mentioned the process is manual and admin-heavy, and the first step is measuring how heavy.
   - Write the criteria for a better system: nonprofit pricing, capacity limits that match your volunteer numbers, automatic confirmation emails, a simple admin view that a volunteer or student can use, refunds, and embedding on your WordPress site.
   - Shortlist two or three options to check against the criteria. Good candidates include The Events Calendar with Event Tickets (stays inside WordPress), Eventbrite (suggested in the assessment for events like Old Fashioned Christmas), and Zeffy (built for nonprofits). Confirm each one's current fees and nonprofit terms yourself before deciding, since pricing changes often.
   - Ask two other BC heritage sites or museums what they use. Peers give you information a review site will not.

8. **Pilot one option on a single event before you change anything else.**
   - Pick one upcoming event, such as a workshop or a themed dinner night, and set up its booking in the option you prefer. Leave your existing process in place for everything else.
   - Compare the pilot with your current process on three numbers: minutes of admin per booking, the number of questions from guests, and how many bookings you took. Keep the comparison to one page.
   - Decide with the data. If the pilot saves meaningful time, move the next event across, and keep a direct link to the booking page on your website so you own the customer details instead of depending on a third party. If it does not, stay with what you have and try the next option on the list.

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Homepage images | Source of the 257 images found and the count under 100 | Under 40 images | Under 40 images, with new uploads optimized automatically |
| Page speed | Mobile and desktop speed 75 or higher | 80 or higher | 80 or higher and holding after new content is added |
| Calls to action | Tap-to-call phone live on every page | Homepage carousel live with Museum, Cafe, and Campground buttons | Click and tap events recorded in GA4 each month |
| Analytics and tracking | GA4, Search Console, and Meta Pixel installed and verified | Key events recording and baselines written down | Monthly website traffic compared with the Search Console history |
| Booking process | Current process mapped with minutes per booking recorded | Shortlist chosen and pilot event set up | Pilot results compared and a decision made |
| Admin time | Baseline minutes per booking recorded | Pilot running on one event | Admin time per booking reduced on the pilot event compared with the baseline |

### Tips
- Fix the images before you build anything new on the homepage. A new carousel on a heavy page makes the page heavier, and the order matters.
- Use three static cards instead of a carousel if your theme makes sliders awkward. A visitor sees all three options at once with no clicking, and that is usually better for conversion and always better for speed.
- Do not change your booking system and your website in the same week. Pilot one event first, measure it, and expand only when you trust the numbers.
- If you are ever unsure what is slowing the site down, run PageSpeed Insights and read the list of opportunities. It ranks them by how much time each would save.
- Keep a short "website changes" note with the date, what you changed, and the speed score before and after. When a developer or a successor looks at the site later, it will save hours.

### Resources
- [PageSpeed Insights](https://pagespeed.web.dev)
- [Squoosh image compressor](https://squoosh.app)
- [TinyPNG](https://tinypng.com)
- [Site Kit by Google](https://sitekit.withgoogle.com)
- [Meta Pixel overview](https://www.facebook.com/business/tools/meta-pixel)
- [Google Campaign URL Builder](https://ga-dev-tools.google.com/campaign-url-builder/)
- [The Events Calendar](https://theeventscalendar.com)
- [Eventbrite](https://www.eventbrite.ca)
- [Zeffy](https://www.zeffy.com)

---

## Tactic 2: Social Engagement on Facebook and Instagram
Phase: Content and Audience
Short Label: Social Engagement
Subtitle: Protect what already works on Facebook, add short video to Instagram without adding hours, and build a plan to reach more locals.

### What We Heard From You

Social media is already your strongest marketing channel. You schedule a month ahead in Plannable at about $10 a month on the nonprofit discount, with content buckets for animals, the cafe, people, and upcoming events, and Facebook is the most successful platform because it matches your core visitors. A single post about the new breakfast reached about 70,000 people, and you have learned that keyword-rich, descriptive captions are the most shareable. Meta ads perform reasonably, but organic posts often beat them. The gaps are specific. Instagram posts about 8.6 times a week but with a 0.3 percent engagement rate, there are no Reels, and the 18 videos on your YouTube channel have been sitting unused. Programming is hard to promote because the program director does not always confirm details in advance, and capacity depends on funding, summer students, and volunteers. You would like to reach more locals and eventually younger visitors, and your newsletter works but does not tell the story of the experience.

### What This Is

A system designed for a one-day-a-week marketer. It keeps the Plannable routine that already works, studies your best posts so you can repeat them, and adds short video by swapping static posts for Reels, not by adding more work. A program fact sheet with a confirmation deadline solves the problem of promoting events that might change. A plan for locals, a more story-led newsletter, a light test of Reddit and TikTok, and a small, careful use of boosts round it out.

### Why It Matters

Facebook and Instagram still reward consistency and real content over polish, and your own results prove it. The breakfast post worked because it announced something new, in plain descriptive language, with a real photo. Short video is the biggest untapped lever, because Reels are shown to people who do not follow you, and your animals, the store, and the cafe are exactly the kind of subjects that perform. Reaching locals matters just as much, since locals return, bring visitors, and support the workshops and cafe all year. The engagement routine is where the algorithm learns whether a post is worth showing to more people, and a few minutes spent replying makes every post work harder.

### Implementation Steps

#### Part A: Protect What Works and Fix the Inputs

1. **Study your best posts and write down what worked.**
   - Open Meta Business Suite, go to Insights, and sort your Facebook and Instagram posts from the past 12 months by reach. List the top 10 on one page, with the date, the topic, the format, and the first line of the caption.
   - Start with the breakfast launch post that reached about 70,000 people. Note what it was: something new, described in plain words, with a real photo and the keywords someone would search. That is a formula you can repeat for every new offering, such as a new workshop, a new menu item, or a new animal.
   - Check the audience insights for the days and times your followers are most active, and use them when you schedule in Plannable. The assessment suggests the first hour after posting is the most important.
   - Write a short caption formula and keep it where you schedule: say what it is, name Harrison Mills, add one specific detail, and ask one question.

2. **Create a program fact sheet and a confirmation deadline.**
   - Make a one-page sheet for every workshop, dinner night, and event, with the title, date, time, cost, ages, capacity, how to book, what to bring, and one good photo. Share it with the program director as a simple form or a shared Google Sheet.
   - Set a lock date six weeks before each event. By the lock date the program director confirms the details or marks the event as tentative. Only confirmed events go into Plannable and the newsletter.
   - When an event is not confirmed in time, fill the slot with one of your permanent offerings: the animals, the cafe, the store, or a story from the archive. Those are always accurate, and they fill the calendar when programming is uncertain.
   - Keep a column in the sheet for the status: confirmed, tentative, or cancelled. It takes two minutes to update and prevents the awkward posts about events that do not happen.

#### Part B: Add Video and Engagement Without Adding Hours

3. **Capture content now and turn it into Reels.**
   - The next two weeks are your last chance to capture the site while it is open. Take photos and 15 to 30 second clips of the animals (especially Maud the calf), the store with a staff member or volunteer showing an artifact, the cafe at work, and any December event. Phone video in natural light is enough, and the platforms now favour real, uncurated content over polished work.
   - Go through the 18 videos on your YouTube channel and pick the best six to eight. Cut each to 15 to 60 seconds, add text overlays so they work without sound, and make the first three seconds the best moment. CapCut and Canva are both free options for this.
   - Use three Reel formats that match the assessment's recommendations: farm animals with visitors, behind the scenes at the 1906 store, and cafe preparation for a themed night. A fourth, a 20-second look at a workshop, works well for locals.
   - Swap, do not add. Replace two or three of your weekly static Instagram posts with Reels, and keep your still images on Facebook, where they already perform well. Schedule the Reels in Plannable, or in Meta Business Suite if your Plannable plan does not support them.
   - If a summer student or volunteer is available, give them the formats and a list of the clips so they can do the editing.

4. **Build the caption and engagement routine, including reviews.**
   - Add a question to the end of most captions. The assessment suggests asking about visitors' childhood memories of heritage sites, asking people to tag a friend planning a Fraser Valley trip, and creating "save this for your Harrison itinerary" posts. Questions are the simplest way to earn comments.
   - Keep your keyword-rich, descriptive captions, since that is your own finding. Add "Harrison Mills" and "Fraser Valley" where they fit naturally, and tag the location on every post.
   - Spend 10 minutes after each posting session replying to comments and messages. Early replies tell the algorithm the post is worth showing to more people.
   - Set a 15-minute weekly routine for Google reviews. Reply to every new review, thank the reviewer by name, and mention what they praised, such as the general store volunteer, the schnitzel nights, or Maud. Write three template replies for the store, the cafe, and the animals so each reply takes five minutes.
   - Reply to the four-star review about the rabbit hutch with care. Thank the reviewer, explain your animal care standards, and mention any improvements you have made. [DESCRIBE YOUR ANIMAL CARE STANDARDS AND ANY HUTCH IMPROVEMENTS]

#### Part C: Reach Locals and Test New Channels

5. **Build a plan for locals.**
   - Locals return for the cafe and the workshops, so build content for them. Plan a recurring "what is on this month" post for workshops, a weekly cafe post, and a regular "new at Kilby" post using the breakfast formula.
   - Create a Facebook Event for each confirmed workshop and dinner night, and share it to local community groups in Harrison, Agassiz, Mission, and the surrounding area. Read each group's rules first, and ask the administrator if you are not sure.
   - Ask Tourism Harrison and local businesses to share your events and use Instagram's Collab feature on posts where a partner is involved.
   - Track local reach with Facebook Insights by looking at the top cities for your audience, and record the share from the Harrison and Fraser Valley area now so you can see it move.
   - Keep the cost low for younger visitors. Feature the free and low-cost parts of a Kilby day, such as the animals, the grounds, and the photo spots, and show the cafe as a budget-friendly stop.

6. **Turn the newsletter into a story as well as a list.**
   - Your monthly Mailchimp newsletter lists upcoming events, and it does not yet convey the experience. Add one short story to every issue: an animal, a volunteer, a building detail, or an artifact from the store. Keep it to 100 words with one photo.
   - Put the story first and the events second. A reader who enjoys the story is more likely to read the event list and click.
   - Add a sign-up link to the cafe counter and the museum desk, and to the website footer.
   - The campground announcement in February gets your highest open rate, so treat it as the main event of the year. Update the campground page, confirm the booking link and dates, and add a UTM tag so you can see how many bookings follow. Send it as usual, and share the same announcement on Facebook and Google Business Profile.

7. **Test Reddit and TikTok with minimal effort.**
   - Search Reddit for communities related to Harrison, the Fraser Valley, BC history, and local heritage, and write down the three or four most active. Read the rules of each one before posting anything.
   - Contribute, do not promote. Share an interesting archive photograph with a fact, or answer a question about local history. Fifteen minutes a week is enough, and Reddit content is indexed quickly, so a good answer can reach AI tools as well as people.
   - TikTok has only been active when summer students were on staff, so do not try to maintain it alone. Post the same Reels you made for Instagram, with no new production, whenever you have capacity. If Plannable supports TikTok on your plan, schedule them there, and otherwise upload them directly when you have a few minutes.

8. **Use boosts sparingly and review monthly.**
   - Your organic posts often beat your ads, so be selective. Once the Meta Pixel is installed, boost only posts that are already performing well and that link to a specific page, such as an event or the breakfast menu.
   - Set a small budget, for example $5 to $10 a day for five days, and target people within about 25 kilometres for local events. Add a UTM tag so you can see the visits.
   - On the first of each month, spend 30 minutes with three questions: which three posts earned the most reach and saves, which format did best, and what did the boosts cost per click. Do more of whatever won.

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Facebook followers | 5,200 baseline recorded; 5,300 | 5,450 | 5,600 |
| Instagram followers | 2,952 baseline recorded; 3,050 | 3,150 | 3,300 |
| Instagram engagement rate | 0.30% baseline recorded; trending up | 0.8% | 1.0% or higher |
| Reels published | 6 repurposed from YouTube and the camera roll | 14 | 24 |
| Reviews | The rabbit hutch review answered; templates written | Every new review answered within a week | Every new review answered within a week, sustained |
| Reach among locals | Baseline share of reach from Harrison, Agassiz, and Mission recorded | Share of local reach up from the baseline | Local reach and event attendance both reported |
| Newsletter | One story added to each issue | Story-led format established | February campground announcement sent with a UTM tag and bookings tracked |
| Program fact sheets | Template created | Lock date used for every spring event | All promoted events confirmed before posting |

### Tips
- Do not abandon what is working. Facebook stills and your Plannable routine are the reason you have 5,200 followers and a 70,000-reach post, so swap Reels in on Instagram without disturbing them.
- Capture before the break. After the site closes there are no new animals or cafe moments to film, and a bank of clips from the next two weeks will carry the posts through the quiet season.
- Ask a question at the end of most captions and answer every comment. The platforms treat those replies as proof the post is worth showing to more people.
- When programming is uncertain, post the permanent offerings. Animals, the store, and the cafe are always accurate and always popular, and they take the pressure off the program director.
- Keep a note of which posts earn saves. A save is the clearest sign that someone is planning a visit, and those are the posts to repeat.

### Resources
- [Plannable](https://plannable.com)
- [Meta Business Suite](https://business.facebook.com)
- [CapCut](https://www.capcut.com)
- [Canva](https://www.canva.com)
- [Mailchimp](https://mailchimp.com)
- [Reddit](https://www.reddit.com)
- [Google Campaign URL Builder](https://ga-dev-tools.google.com/campaign-url-builder/)

---

## Tactic 3: AI Search Visibility Through Topic Clusters
Phase: Search and AI Visibility
Short Label: AI Search & Topics
Subtitle: Correct what search and AI tools say about Kilby today, then build question-led topic clusters from your heritage knowledge so Kilby becomes the source they quote.

### What We Heard From You

On the call we covered how search has changed. People now ask AI tools full questions, and the tools assemble a synthesized answer from the sources they trust. They treat a website as an entity, which means the more accurate and specific the information is across the internet, the more confidently Kilby is described. You have a clear advantage, which is heritage knowledge and local knowledge that no one else has. There is also a problem to fix first. Outdated third-party publications sometimes appear in search with incorrect information, and you agreed to check and review the organization's Wikipedia page to make sure it is accurate. The assessment also found that you have strong local visibility, a claimed Google Business Profile, and consistent name, address, and phone information, so this tactic builds on a good base.

### What This Is

A two-stage tactic. The first stage is cleanup: find out what search and AI tools currently say about Kilby, correct the Wikipedia article through the proper channel, and fix outdated listings so every source says the same thing. The second stage is content: a FAQ page, a Plan Your Visit hub, and five topic clusters, each with a pillar page and a question post, built from the knowledge you already hold as the curator. Every page is written as a direct question with the answer in the first sentence.

### Why It Matters

AI tools do not rank pages, they assemble answers, and they favour sources that answer a specific question completely. A page called "Can you touch the animals at Kilby?" with a clear answer is far more likely to be quoted than a general page about the farm. Your difficulty with outdated information is also a reason to act, because an AI tool that finds conflicting hours or admission prices will either hedge or repeat the wrong one. Correcting the record and publishing the right answers puts you in control of what visitors, including families planning a day trip, are told about Kilby.

### Implementation Steps

#### Part A: Fix What Search and AI Tools Say Today

1. **Audit what search and AI tools currently say.**
   - Write 12 prompts that match how a visitor would ask, and use the same wording every month: "things to do in Harrison Mills," "Kilby Historic Site hours," "Kilby Historic Site admission," "family-friendly attractions near Harrison Hot Springs," "farm animals near Harrison Hot Springs for kids," "where to eat breakfast in Harrison Mills," "heritage sites in the Fraser Valley," "BC provincial heritage properties," "camping near Harrison Mills," "workshops for kids in the Fraser Valley," "Kilby cafe schnitzel night," and "school field trips Fraser Valley heritage."
   - Run them in ChatGPT, Perplexity, Gemini, and Google AI Overviews. In a Google Sheet, record whether Kilby is named, which page is cited, whether the details are correct, and which other sites appear.
   - Search Google for "Kilby Historic Site" and "Kilby Historic Site hours," and list every page that shows incorrect or outdated information, such as old guides, blogs, and PDFs. Write down the address of each one.
   - Read your Wikipedia article and list anything that is wrong, out of date, or unsupported.

2. **Correct the record.**
   - Wikipedia: because you work for Kilby, Wikipedia asks you to avoid editing the article directly. Instead, disclose your connection on your user page, go to the article's Talk page, and post a clear edit request that lists each correction with a link to a published, reliable source. Another editor reviews it. Keep the tone factual and avoid promotional language.
   - Outdated pages: contact the owner of each page you listed and ask them to update it. A short message works: "Your page lists Kilby's hours as [OLD]. They are now [NEW]. Here is our visit page for reference." Many publishers are glad to fix it.
   - Directories: update or claim your listings with Tourism Harrison, the Fraser Valley Regional District, Destination BC, TripAdvisor, and Google, so the name, address, phone, hours, and description match exactly. The assessment suggests this as a way to add quality citations and reach visitors who use official tourism sites.
   - Make your own visit page the clear source of truth, with hours, admission, parking, and accessibility, and a "last updated" date. Link to it from every listing.
   - Decide whether the cafe or the campground should have its own Google listing. Google allows this only when the business has a different name, category, and hours, so make the choice carefully and do not rush it.

#### Part B: Build the Foundation Pages

3. **Update the FAQ page.**
   - Open your current FAQ page in WordPress and read it the way a visitor would. List every question already on it, mark anything that is out of date, and note what is missing. Keep the questions that already work, and edit the page in place. Do not create a new page or change the web address, so the links and search history the page has already earned stay with it.
   - Rewrite each question as a heading and answer it in the first sentence below. The assessment recommends covering the questions visitors already ask: can we touch the animals, how long does a typical visit take, is the cafe open the same hours as the museum, and are pets allowed.
   - Check the page against this list, and add or update whatever is missing. Complete the facts only you have:
     - "What are Kilby's hours?" Kilby is open on Saturdays and Sundays from 10 AM to 4 PM, and the museum opens at 11 AM. [CONFIRM CURRENT SEASON HOURS AND THE BREAK DATES]
     - "How much does it cost to visit Kilby?" [INSERT ADMISSION PRICES AND ANY FAMILY RATE]
     - "Can you touch the animals at Kilby?" [CONFIRM RULES FOR EACH ANIMAL]
     - "How long does a typical visit take?" [ADD A TYPICAL VISIT LENGTH]
     - "Is the cafe open the same hours as the museum?" [CONFIRM CAFE HOURS AND BREAKFAST TIMES]
     - "Are pets allowed on the grounds?" [CONFIRM POLICY]
     - "Can I camp at Kilby, and how do I book?" Yes, the campground is available by online booking. [ADD THE BOOKING LINK AND SEASON]
     - "Can I bring a school group to Kilby?" [DESCRIBE SCHOOL PROGRAMS AND HOW TO BOOK]
     - "Is Kilby accessible?" [COPY THE EXISTING ACCESSIBILITY INFORMATION]
     - "Where is Kilby and where do I park?" Kilby is in Harrison Mills, and parking details are on the visit page. [ADD DRIVING DIRECTIONS FROM HARRISON HOT SPRINGS]
   - If the page uses an accordion, switch to visible headings, so the text is easy for search engines and AI tools to read. Add a "last updated" date at the top, and link the page from the footer and the main menu if it is not already there.

4. **Create a Plan Your Visit hub.**
   - Add a page called something like "Plan Your Harrison Mills Day Trip" and link it from the main menu. It is the front door to your topic clusters and the page you point partners to.
   - Include a simple half-day and full-day itinerary: the animals, the store, the cafe, and the nearby sights. The assessment suggests pages such as "Planning Your Harrison Mills Day Trip," "Best Photo Spots at Kilby," and "What to See Near Harrison Hot Springs" because they capture long-tail local searches with less competition than broad terms.
   - End each section with a link to the matching pillar page and a button to the visit page. The hub grows as the clusters are published.

#### Part C: Publish the Clusters

5. **Choose your five clusters and the questions behind each.**
   - A topic cluster is a pillar page supported by question posts on the same subject. Pick five that match your audiences and your heritage knowledge. A starting set:
     - **The 1906 General Store and Kilby History.** Serves history enthusiasts, seniors, and school groups.
     - **Farm Animals and Visiting with Kids.** Serves young families and grandparents.
     - **The Cafe: Breakfast, Lunch, and Dinner Nights.** Serves locals and day-trippers.
     - **Planning Your Visit: Day Trips and Camping.** Serves visitors from Harrison and the Lower Mainland.
     - **Workshops, Events, and School Programs.** Serves locals, families, and teachers.
   - For each cluster, write down 8 to 10 candidate questions from your reviews, the questions you hear at the desk, and AnswerThePublic. Choose the two most specific for the pillar page and the first post.
   - Save the questions in a Google Sheet with columns for cluster, question, status, and the date published.

6. **Write the five pillar pages.**
   - A pillar page is the main page for a cluster: 500 to 800 words, one H1, a direct overview in the first paragraph, and a section for each of the cluster's main questions, linking to the full question post.
   - Add a button to the visit page or the booking page near the top and the bottom, with a UTM tag. Link each pillar to the other four, so the hub reads as one connected body of work.
   - Write the history pillar first, because that is where you have the most distinctive knowledge. A curator's answer to a question about a 1906 store is something no one else can give.

7. **Write and publish the question posts.**
   - Each cluster gets one question post of 250 to 450 words. The H1 is the question, the first sentence is a direct answer, and the details follow. Add one real photo and a link to the pillar page and the visit page.
   - Use Claude to draft, but give it the facts. A reliable prompt: "Write a 300-word answer for the Kilby Historic Site website to the question below. The first sentence must answer the question directly. Use only the facts I provide, and do not invent dates, prices, or details. The tone is warm, clear, and friendly. Facts: [PASTE]." Then check every claim yourself before publishing.
   - Add one detail only you would know to every post, such as a story about an artifact or what a volunteer tells children at the store counter. That is what separates your answer from a generic summary.
   - Publish at about two pieces a week during the break, one question post and one pillar page, and let the new content feed your social posts.

8. **Add structured data and measure monthly.**
   - Use your SEO plugin, such as Rank Math or Yoast, to add structured data. Add Museum schema for the heritage site, CafeOrCoffeeShop for the cafe, Campground for the campground, and Event schema for confirmed workshops and dinner nights. If you do not have an SEO plugin, install the free version of one of them.
   - Test each page with Google's Rich Results Test and fix any errors it reports.
   - Link each new page from the hub and from at least two related pages. Internal links tell search engines and AI tools the pages belong together.
   - Rerun the 12 prompts in Weeks 4, 10, and 12, and compare the results with the baseline. Check Search Console each month for the questions bringing visitors to the new pages.

### Success Metrics
| Metric | 30 Days | 60 Days | 90 Days |
|--------|---------|---------|---------|
| Baseline audit | 12 prompts run across four tools and results recorded; outdated pages and Wikipedia errors listed | Corrections submitted and outdated publishers contacted | Fewer incorrect sources appearing in the prompt results |
| Wikipedia | Errors listed with sources | Edit request posted on the Talk page with your connection disclosed | Article accurate, or edit requests answered |
| Directory listings | List of listings to update written | Tourism Harrison, FVRD, Destination BC, TripAdvisor, and Google all match | No conflicting hours or admission found in a fresh search |
| Foundation pages | FAQ page drafted | FAQ page and Plan Your Visit hub live | Hub links to all five clusters |
| Content published | Cluster questions chosen | 4 pieces live | 10 pieces live: 5 pillar pages and 5 question posts |
| AI visibility | Baseline recorded | Second test shows Kilby named in more prompts | Kilby named in more prompts than at baseline, with correct details |
| Search Console | Connected and baseline recorded | Question-led queries appearing | Impressions and clicks on cluster pages growing month over month |

### Tips
- Fix the record before you build the content. If an AI tool is repeating wrong hours or admission prices, new pages will compete with old ones until the old ones are corrected.
- Be transparent on Wikipedia. Posting an edit request with a disclosed connection and good sources is the accepted route, and editing directly without disclosure can get changes reversed.
- Your knowledge as the curator is the edge. A page that answers "Why is Kilby one of BC's 11 provincial heritage properties?" with the real story cannot be copied by a generic travel site.
- Never publish a guess. A wrong price or an out-of-date hour is the first thing an AI tool repeats, so use the placeholders until you have confirmed each fact.
- Use the quiet season. The break is the best time to write, because the content you publish now will already be indexed when you reopen.

### Resources
- [Google Search Console](https://search.google.com/search-console)
- [AnswerThePublic](https://answerthepublic.com)
- [Perplexity AI](https://perplexity.ai)
- [Claude](https://claude.ai)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Wikipedia: Conflict of interest guidance](https://en.wikipedia.org/wiki/Wikipedia:Conflict_of_interest)
- [Schema.org Museum](https://schema.org/Museum)

---

## Objectives

### Objective 1
Title: A Faster, Clearer Site That Is Easier to Book
Description: Cut the homepage images, compress and cache the site, add a museum, cafe, and campground call-to-action carousel, and pilot a booking option that takes less of your time.
Tactic Pill: Tactic 1 · Weeks 1-12

### Objective 2
Title: Social Reach That Matches Your Best Posts
Description: Repeat the breakfast post formula, add Reels by swapping static posts, and build a plan to reach more locals, all sized for one marketing day a week.
Tactic Pill: Tactic 2 · Weeks 1-12

### Objective 3
Title: The Source AI Tools Quote About Kilby
Description: Correct the Wikipedia page and outdated listings, then publish a FAQ, a Plan Your Visit hub, and five topic clusters built from your heritage knowledge.
Tactic Pill: Tactic 3 · Weeks 1-12

---

## 90-Day Roadmap

Month 1 Name: Capture and Foundation
Month 2 Name: Build During the Break
Month 3 Name: Publish and Prepare to Reopen

### Week 1: Capture, Baselines, and Quick Fixes
**Actions:**
- Capture photos and short video of the animals, the store, the cafe, and any December event while you are still open → links to: Tactic 2 / Step 3
- Reply to the four-star rabbit hutch review and write three review reply templates → links to: Tactic 2 / Step 4
- Install Site Kit, Google Analytics 4, and the Meta Pixel, and record your baselines: followers, engagement rate, PageSpeed score, and Search Console clicks → links to: Tactic 1 / Step 6
- Read your Wikipedia article and the top Google results for Kilby, and list everything that is wrong or out of date → links to: Tactic 3 / Step 1

**Checklist:**
- [ ] 20 or more photos and 5 or more clips from the open season are saved in one folder
- [ ] The rabbit hutch review has a reply and three templates are saved
- [ ] GA4, Search Console, and the Meta Pixel are installed and verified
- [ ] A baseline sheet records followers, engagement rate, and the PageSpeed score
- [ ] A list of outdated pages and Wikipedia errors exists

### Week 2: Image Audit and the Last Open Week
**Actions:**
- Find what is producing the 257 images on the homepage and cut the list → links to: Tactic 1 / Step 1
- Resize and compress the homepage images and install an image optimization plugin → links to: Tactic 1 / Step 2
- Study your best posts, including the 70,000-reach breakfast post, and write the one-page note and caption formula → links to: Tactic 2 / Step 1
- Capture any final footage and schedule December and January content in Plannable, swapping two or three static posts a week for Reels → links to: Tactic 2 / Step 3

**Checklist:**
- [ ] The homepage image count is under 100 and the new PageSpeed score is recorded
- [ ] The image optimization plugin is installed and the homepage images are compressed
- [ ] A one-page "what works" note and caption formula are written
- [ ] December and January content is scheduled

### Week 3: Speed, Fact Sheets, and First Reels
**Actions:**
- Finish compressing the media library as the plugin's free tier allows → links to: Tactic 1 / Step 2
- Check lazy loading and install one caching plugin → links to: Tactic 1 / Step 3
- Create the program fact sheet and set the six-week lock date for spring events → links to: Tactic 2 / Step 2
- Turn the best six to eight YouTube videos into Reels → links to: Tactic 2 / Step 3
- Write down any questions for the follow-up call with your coach

**Checklist:**
- [ ] The homepage scores 75 or higher in PageSpeed Insights on mobile
- [ ] One caching plugin is active and tested on mobile data
- [ ] The program fact sheet and lock date are shared with the program director
- [ ] Six Reels are edited and scheduled

### Week 4: Homepage Calls to Action and the AI Baseline
**Actions:**
- Build the homepage call-to-action carousel for the museum, cafe, and campground → links to: Tactic 1 / Step 4
- Make the phone number tap-to-call and add Book and Reserve buttons on the event, cafe, and contact pages → links to: Tactic 1 / Step 5
- Run the 12-prompt AI baseline across ChatGPT, Perplexity, Gemini, and Google AI Overviews → links to: Tactic 3 / Step 1
- Schedule the holiday-week posts in Plannable → links to: Tactic 2 / Step 3

**Checklist:**
- [ ] The homepage carousel is live with Museum, Cafe, and Campground buttons
- [ ] The phone number is tappable on every page and Book buttons are visible
- [ ] AI baseline results are recorded in a sheet
- [ ] Holiday-week posts are scheduled

### Week 5: Holiday Week, Light
**Actions:**
- Reply to any new comments, messages, and reviews, even briefly → links to: Tactic 2 / Step 4
- Choose the five clusters and list 8 to 10 candidate questions for each → links to: Tactic 3 / Step 5
- Confirm the Plannable schedule runs through early January

**Checklist:**
- [ ] No review or comment has gone unanswered for more than a week
- [ ] Five clusters and their questions are saved in a sheet
- [ ] Posts are scheduled through the first week of January

### Week 6: Correct the Record and Build the FAQ
**Actions:**
- Post your Wikipedia edit request on the Talk page with your connection disclosed and sources attached → links to: Tactic 3 / Step 2
- Contact the owners of outdated pages and update your Tourism Harrison, FVRD, Destination BC, TripAdvisor, and Google listings → links to: Tactic 3 / Step 2
- Update the FAQ page with direct first-sentence answers → links to: Tactic 3 / Step 3
- Add a "last updated" date to the hours and admission section of your visit page → links to: Tactic 1 / Step 5

**Checklist:**
- [ ] The Wikipedia edit request is posted with sources
- [ ] A message has been sent to each outdated publisher on your list
- [ ] The FAQ page is live with confirmed facts and no placeholders
- [ ] The visit page shows a current "last updated" date

### Week 7: Booking Options and the History Cluster
**Actions:**
- Map your current booking process, record minutes per booking, and shortlist two or three options → links to: Tactic 1 / Step 7
- Build the Plan Your Harrison Mills Day Trip hub page → links to: Tactic 3 / Step 4
- Publish the history question post and the history pillar page → links to: Tactic 3 / Step 7
- Do the 15-minute review routine and reply to any new comments → links to: Tactic 2 / Step 4

**Checklist:**
- [ ] Booking pain points and baseline minutes per booking are written down
- [ ] A shortlist of booking options is saved
- [ ] The Plan Your Visit hub is live and in the main menu
- [ ] The history question post and pillar page are published

### Week 8: Pilot, Animals, and Reddit
**Actions:**
- Set up a booking pilot on one spring event in your preferred option → links to: Tactic 1 / Step 8
- Publish the animals and families question post and pillar page → links to: Tactic 3 / Step 7
- Search for relevant subreddits, read their rules, and make your first contribution → links to: Tactic 2 / Step 7
- Add a story to the next newsletter and write the issue → links to: Tactic 2 / Step 6

**Checklist:**
- [ ] The pilot event has its own booking page live
- [ ] The animals and families posts are published
- [ ] Three or four subreddits are identified and one contribution is made
- [ ] The newsletter has a story first and the events second

### Week 9: Cafe, Locals, and Structured Data
**Actions:**
- Publish the cafe question post and pillar page → links to: Tactic 3 / Step 7
- Build the locals plan: Facebook Events, community groups, and a regular "what is on this month" post → links to: Tactic 2 / Step 5
- Add Museum, Cafe, Campground, and Event schema and test with the Rich Results Test → links to: Tactic 3 / Step 8
- Run a small boost on your best-performing post, linked to the matching page → links to: Tactic 2 / Step 8

**Checklist:**
- [ ] The cafe question post and pillar page are published
- [ ] Facebook Events and local group shares are in place for confirmed workshops
- [ ] Schema passes the Rich Results Test on the key pages
- [ ] The first boost is logged with spend and clicks

### Week 10: Planning, Camping, and the February Announcement
**Actions:**
- Publish the planning and camping question post and pillar page → links to: Tactic 3 / Step 7
- Update the campground page, confirm the booking link and dates, and draft the February announcement with a UTM tag → links to: Tactic 2 / Step 6
- Run the second AI visibility test and compare it with the baseline → links to: Tactic 3 / Step 8
- Check that GA4 is recording clicks on Book buttons, phone taps, and booking page visits → links to: Tactic 1 / Step 6

**Checklist:**
- [ ] The planning and camping posts are published
- [ ] The February announcement is drafted and scheduled
- [ ] The second AI test is logged and compared with the baseline
- [ ] GA4 key events are recording

### Week 11: Workshops, Announcement, and Pilot Results
**Actions:**
- Send the campground announcement by newsletter, and share it on Facebook and Google Business Profile → links to: Tactic 2 / Step 6
- Publish the workshops and school programs question post and pillar page → links to: Tactic 3 / Step 7
- Compare the pilot with your current booking process on minutes per booking, guest questions, and bookings → links to: Tactic 1 / Step 8
- Run the monthly review: top posts, best format, boost cost per click → links to: Tactic 2 / Step 8

**Checklist:**
- [ ] The campground announcement is sent and its UTM-tagged bookings are tracked
- [ ] The workshops question post and pillar page are published
- [ ] The pilot comparison is written on one page
- [ ] The monthly review is saved with the top three posts

### Week 12: 90-Day Review and Plan Forward
**Actions:**
- Run the final AI visibility test and compare it with the baseline and Week 10 → links to: Tactic 3 / Step 8
- Compare website traffic, speed score, and Search Console clicks with your Week 1 baseline → links to: Tactic 1 / Step 6
- Pull the 90-day social summary: followers, engagement rate, Reels reach, and share of reach from locals → links to: Tactic 2 / Step 8
- Decide on the booking system based on the pilot, and write the next steps → links to: Tactic 1 / Step 8
- Write three things that worked and one thing to change, and plan the content for the reopening

**Checklist:**
- [ ] The final AI test is logged with the progression across all three tests
- [ ] Traffic, speed, and Search Console comparisons are written with numbers
- [ ] The 90-day social summary exists with specific numbers
- [ ] The booking decision is made with a written reason
- [ ] The next 90-day priorities are decided

---

## GBP Quick Wins

These are small jobs that pay back quickly. Most take under an hour, and none needs to wait for the larger work in the plan.

### On the Google Business Profile

- **Set seasonal hours and closure dates.** Add the break dates to every listing, including Google, TripAdvisor, and the tourism directories, so nobody drives out to a closed site. Google lets you add special hours in advance.
- **Reply to your recent reviews.** Start with the four-star review about the rabbit hutch and thank the reviewer, explain your animal care, and mention any improvements. Then reply to the others, naming what each guest praised, such as the general store volunteer, the schnitzel nights, or Maud.
- **Post about your events with a booking link.** The assessment recommends weekly posts for upcoming events like schnitzel night and Old Fashioned Christmas, with a photo and a link. Each takes about 20 minutes and appears directly in Google Maps and search results.
- **Add review prompts where guests are already engaged.** A small card on cafe receipts for dinner nights, a sign near the exit, and a line in post-visit confirmation emails. Do not offer anything in exchange, since that breaks Google's rules.
- **Confirm the listings that matter.** Check Tourism Harrison, the Fraser Valley Regional District, and Destination BC, and claim any you do not yet control.

### On the Website

- **Make the phone number tap-to-call.** (604) 796-9576 appears in the footer and on the contact page but cannot be tapped. Seventy percent of tourism traffic is on mobile.
- **Compress the homepage images.** The assessment lists 257 images and recommends free tools such as TinyPNG or Squoosh for a quick first pass, and it is the single biggest speed improvement available.
- **Install Google Analytics 4 and the Meta Pixel.** Without them you cannot tell which platforms and posts lead to bookings.
- **Add an embedded Google Map with a Get Directions button.** Your directions are strong, and a one-tap map on the contact page helps spontaneous day-trippers on rural roads.
- **Consider a translation option for visitors.** The assessment suggests a Google Translate widget for Simplified and Traditional Chinese and Punjabi. It is low priority and is not indexed by search engines, so treat it as a courtesy for visitors, not as an SEO tool.

### One Thing Worth Watching

The February campground announcement is your best-performing email, and it is also a clean test of the whole plan. This year it will arrive with a faster website, a clear Book a Campsite button, tracked links, and a social post and Google Business Profile post sitting beside it. Check how many bookings come from each channel in the weeks that follow. If the email still leads, you know where to put your time, and if social and search are closing the gap, that is the first sign the work in this plan is building a second engine.
