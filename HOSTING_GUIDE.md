
# Hostinger & WordPress Deployment Guide

### 1. Hostinger Setup (Shared Hosting)
1. **Build the Project**: On your local machine, run `npm run build`. This will create a `dist` folder.
2. **Prepare Environment**: Ensure your `.env` file has the `GEMINI_API_KEY` before building, as Vite embeds these during the build process.
3. **Open hPanel**: Log in to Hostinger and go to **File Manager**.
4. **Upload Files**: Navigate to `public_html` and upload the **contents** of the `dist` folder (not the folder itself).
5. **Add .htaccess**: Ensure the `.htaccess` file from the root of this project is also uploaded to `public_html`. This handles React routing.
6. **Permissions**: Ensure files are set to `644` and folders to `755`.

### 2. WordPress API Configuration
For the "Auto-Publish" feature to work, follow these steps:
1. Log in to your **WordPress Dashboard**.
2. Go to **Users > Profile**.
3. Scroll down to the **Application Passwords** section.
4. Type `AutoStudio` in the "New Application Password Name" field and click **Add New**.
5. **IMPORTANT**: Copy the password provided (e.g., `xxxx xxxx xxxx xxxx`). It will not be shown again.
6. Open your hosted AutoStudio app, go to **Settings**, and enter:
   - **Site URL**: `https://yourdomain.com`
   - **Username**: Your WP login username.
   - **App Password**: The code you just copied.

### 3. Troubleshooting
- **403 Forbidden**: Ensure your file permissions are set to 644 and folders to 755 in Hostinger File Manager.
- **CORS Error**: If WordPress blocks the request, install the "JSON Basic Auth" plugin or ensure your server allows REST API requests from your app's domain.
- **Trends Not Loading**: Ensure your API key is valid. The app uses `gemini-3-flash-preview` for trend analysis via Google Search.
