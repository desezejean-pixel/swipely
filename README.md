# Swipely

**Swipe through internships and jobs that fit your CV, then track every application.**
A free Chrome extension. Everything stays on your computer: no account, no server, no paid service.

- **Discover:** new offers arrive every day from LinkedIn, big tech career sites (Google, Amazon, Apple, Nvidia, Stripe), VC Careers and startups you follow. Swipe right to like, left to pass.
- **Match score:** every offer gets a score from 0 to 100 against your CV and preferences, and the score learns from your swipes.
- **Board:** drag each application through the steps (To apply → Applied → Interview → Offer). Red dots tell you when something needs doing.
- **Your documents:** a CV and a cover letter tailored to each offer you like, in French or English, ready to save as PDF.
- **Messages and people:** ready-to-send LinkedIn notes and e-mails, and one-click searches to find someone at the company to talk to.
- **Calendar:** interviews, follow-ups and deadlines go into Apple Calendar, Google Calendar or Outlook.
- **French or English** interface.

> **En français :** Swipely trouve chaque jour des stages et emplois qui correspondent à ton CV, tu les balaies comme sur Tinder, puis tu suis tes candidatures. Gratuit, tout reste sur ton ordinateur. Les étapes d'installation sont plus bas, en français aussi.

## Install (5 minutes, one time)

You need **Google Chrome** on a computer (Mac, Windows or Linux).

1. **Download Swipely:** go to the [latest release](../../releases/latest) and click **Swipely.zip** under *Assets*.
2. **Unzip it:** double-click the downloaded file. You get a folder named **Swipely**.
3. **Put the folder somewhere it can stay**, for example in *Documents*. Don't delete or move it later: Chrome runs Swipely from this folder.
4. Open Chrome, type `chrome://extensions` in the address bar and press **Enter**.
5. Turn on **Developer mode** (the switch in the top-right corner).
6. Click **Load unpacked** (top-left) and select the **Swipely** folder.
7. Click the puzzle-piece icon in Chrome's toolbar, then the pin next to **Swipely**, so its icon stays visible.
8. Click the Swipely icon, then **Open tracker**. The welcome screen helps you fill in your CV.

Chrome may show a message about extensions in developer mode when it starts: that's normal for extensions installed this way, click **Keep**.

### Installation en français

1. **Télécharge Swipely :** va sur la [dernière version](../../releases/latest) et clique sur **Swipely.zip** dans *Assets*.
2. **Décompresse-le :** double-clique sur le fichier téléchargé. Tu obtiens un dossier **Swipely**.
3. **Range le dossier à un endroit fixe**, par exemple dans *Documents*. Ne le supprime pas et ne le déplace pas ensuite : Chrome fait tourner Swipely depuis ce dossier.
4. Ouvre Chrome, tape `chrome://extensions` dans la barre d'adresse et appuie sur **Entrée**.
5. Active le **Mode développeur** (l'interrupteur en haut à droite).
6. Clique sur **Charger l'extension non empaquetée** (en haut à gauche) et choisis le dossier **Swipely**.
7. Clique sur l'icône en forme de pièce de puzzle dans la barre de Chrome, puis sur l'épingle à côté de **Swipely**.
8. Clique sur l'icône Swipely, puis sur **Open tracker**. L'écran d'accueil t'aide à remplir ton CV. Pour passer l'app en français : menu **⋯** → **Français**.

## First steps

1. **Fill in your CV:** menu **⋯** → **My CV** → **Auto-fill from my CV**. Paste the text of your CV or open a Word file. Check each tab, then **Save my CV**.
2. **Set your preferences:** menu **⋯** → **Preferences**. Choose the jobs you want, the places, and words to favour or avoid. Press **Save**: every search follows these criteria.
3. **Swipe:** new offers arrive in **Discover** within the hour, then every day. Like the ones you want.
4. **Apply:** open a liked offer on the **Board**. The **To do** tab tells you the next step; **CV & letter** has your documents.

## Save an offer from any site

On an offer page (LinkedIn, Welcome to the Jungle, JobTeaser, a company's careers page…), click the Swipely icon or press **Option+Shift+S** (**Alt+Shift+S** on Windows). The form fills itself in; press **Save**.
On a page listing several offers, a blue line offers to add several at once.

## Good to know

- **Your data stays in your Chrome.** Removing the extension erases it, so use **⋯ → Backup** now and then (and **Restore backup** to load it back).
- **LinkedIn is read logged out**, slowly (at most about 80 requests a day), so your LinkedIn account is never used. If LinkedIn asks to slow down, Swipely pauses for 3 hours.
- **No window or tab ever opens by itself:** sites are read invisibly in the background. Chrome must be open for new offers to arrive.
- **Some sites can't be read automatically** (Welcome to the Jungle searches, JobTeaser, Station F, Microsoft, Meta, Salesforce): save their offers with the toolbar button instead.
- **Cover letters with AI:** if your computer supports Chrome's free built-in AI, **Improve with Chrome AI** rewrites your letter. Nothing is sent to a paid service.
- **Better logos (optional):** a free key from [logo.dev](https://www.logo.dev) gives exact company logos: **⋯ → Preferences → Logos**.

## Update to a new version

Download the new **Swipely.zip**, replace the contents of your Swipely folder with the new files, then open the tracker: it reloads itself. Your offers and CV are kept.

## For developers

Plain JavaScript, no build step. Load the folder unpacked in Chrome and edit the files; the tracker reloads the extension when `manifest.json`'s version changes.
To keep a personal CV in code, create `cv-data.js` next to `cv-data.example.js` (same format): it's loaded after the example and ignored by git.
