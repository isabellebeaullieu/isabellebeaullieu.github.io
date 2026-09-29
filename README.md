# Isabelle Beaullieu — Listings Website

A simple site that shows current listings and sends buyer inquiries to a Google Sheet.

## Where things live

| File | What it controls |
|---|---|
| `data/listings.json` | **The listings.** Add, edit, or remove homes here. |
| `assets/img/listings/website-photos/` | Listing photos, one folder per home |
| `assets/img/logo.svg` | The logo |
| `assets/js/config.js` | Phone, email, office, logo, and the Google Sheet connection |
| `assets/css/style.css` | Colors and fonts (the color settings are at the very top) |
| `google-apps-script/Code.gs` | The script that goes inside the Google Sheet |

## Add a listing

1. Upload photos to `assets/img/listings/website-photos/`, one folder per home (e.g. `123-main-st/01.jpg`). Landscape photos about 2000px wide look best.
2. In `data/listings.json`, copy an existing listing block and change the details.

- `id` must be unique. It becomes the web address: `listing.html?id=123-main-st-lafayette`.
- `status` is one of `Active`, `Coming Soon`, or `Pending`.
- The first photo is the cover. `galleryPicks` (optional) chooses which three photos show at the top of the listing page, by photo number, e.g. `[1, 7, 26]`.
- `bathsDisplay` (optional) shows baths your way, e.g. `"2 / 1"`.
- `neighborhoodTitle`, `neighborhoodText`, and `neighborhoodPhotos` (optional) add a neighborhood section below the listing.
- The first listing on the page also becomes the large photo at the top of the home page.
- Keep commas between listings, and none after the last one.

## Remove a sold listing

Delete that listing's block from `data/listings.json` (and its photo folder if you like). Anyone who opens an old link sees a friendly "This home has found its owner" page with a link back to current listings.
