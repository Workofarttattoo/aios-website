# 🚀 Deploy Ai|oS Website to aios.is

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `aios-website`
3. Description: `Official Ai|oS website - 23 quantum algorithms`
4. Set to **Public**
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

---

## Step 2: Push Code to GitHub

Run these commands in Terminal:

```bash
cd /Users/noone/aios-website

# Add GitHub remote
git remote add origin https://github.com/workofarttattoo/aios-website.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Enter your GitHub credentials when prompted.**

---

## Step 3: Enable GitHub Pages

1. Go to https://github.com/workofarttattoo/aios-website/settings/pages
2. Under "Source":
   - Branch: `main`
   - Folder: `/ (root)`
3. Click **Save**
4. Wait 1-2 minutes for deployment
5. Your site will be live at: `https://workofarttattoo.github.io/aios-website/`

---

## Step 4: Configure Custom Domain (aios.is)

### A. In GitHub Repository Settings:

1. Still in Settings → Pages
2. Under "Custom domain", enter: `aios.is`
3. Click **Save**
4. Check **"Enforce HTTPS"** (may take a few minutes to enable)

### B. In Namecheap Dashboard:

1. Log in to https://namecheap.com
2. Go to **Domain List** → Find **aios.is** → Click **Manage**
3. Go to **Advanced DNS** tab
4. **Delete all existing records** (if any)
5. **Add these new records**:

```
Type: A
Host: @
Value: 185.199.108.153
TTL: Automatic

Type: A
Host: @
Value: 185.199.109.153
TTL: Automatic

Type: A
Host: @
Value: 185.199.110.153
TTL: Automatic

Type: A
Host: @
Value: 185.199.111.153
TTL: Automatic

Type: CNAME
Host: www
Value: workofarttattoo.github.io
TTL: Automatic
```

6. Click **Save All Changes**

---

## Step 5: Verify Domain

### In GitHub (after DNS configuration):

1. Go back to https://github.com/workofarttattoo/aios-website/settings/pages
2. You should see: "DNS check successful"
3. If not, wait 10-30 minutes for DNS propagation
4. Check **"Enforce HTTPS"** again

---

## Step 6: Test Your Website

After 15-30 minutes (DNS propagation time):

1. Visit https://aios.is
2. You should see your Ai|oS landing page!
3. Visit https://aios.is/launcher/ for the HUD

### Verify Checklist:

- [ ] https://aios.is loads correctly
- [ ] SSL certificate is active (green padlock)
- [ ] "23 Quantum Algorithms" displays
- [ ] "Level 4 Autonomy" displays
- [ ] "Exp Quantum Speedup" displays
- [ ] https://aios.is/launcher/ loads
- [ ] No browser errors in console (F12)

---

## Troubleshooting

### DNS Not Working?
- Wait up to 48 hours for full propagation
- Check status: https://dnschecker.org (search for "aios.is")
- Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### SSL Certificate Issues?
- Uncheck and re-check "Enforce HTTPS" in GitHub Pages settings
- Wait 15-30 minutes after enabling custom domain
- Try accessing via https://www.aios.is

### Site Not Loading?
1. Verify DNS records in Namecheap
2. Check GitHub Pages deployment status
3. Ensure "Enforce HTTPS" is enabled
4. Try incognito/private browsing mode

---

## Updating Your Website

To make changes:

```bash
cd /Users/noone/aios-website

# Edit files
vim index.html

# Commit and push
git add .
git commit -m "Update website"
git push origin main

# GitHub Pages auto-deploys in 1-2 minutes
```

---

## Quick Commands Reference

```bash
# Check DNS propagation
dig aios.is

# Test local website
cd /Users/noone/aios-website
python3 -m http.server 8000
# Visit http://localhost:8000

# Check GitHub Pages status
gh api repos/workofarttattoo/aios-website/pages
```

---

## Success! 🎉

Once DNS propagates, your Ai|oS website will be live at:
- **Main Site**: https://aios.is
- **Launcher**: https://aios.is/launcher/
- **GitHub Repo**: https://github.com/workofarttattoo/aios-website

---

## Next Steps

- [ ] Add Google Analytics (optional)
- [ ] Set up email forwarding at Namecheap (joshua@aios.is, admin@aios.is)
- [ ] Add sitemap.xml for SEO
- [ ] Enable Cloudflare CDN (optional, for speed)
- [ ] Monitor uptime with https://uptimerobot.com

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
