This folder holds brand assets used by the PDF export.

Expected files (commit the real assets):

- arx_logo_Logo_basic_rich_black.png
- Stationery_All_arx_letterhead.png

Notes

- The PDF function prefers environment variables `PDF_LOGO_URL` and `PDF_LETTERHEAD_URL` if provided.
- If the above files are not present, the function falls back to `arx_website_blueblack.webp` in the site root for the logo and renders without a letterhead.

