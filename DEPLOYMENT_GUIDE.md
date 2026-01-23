# TaskFlow - Deployment Guide

Complete step-by-step guide for deploying TaskFlow to production using Git, Docker, Render (Backend), and Vercel (Frontend).

---

## 📑 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Git Repository Setup](#step-1-git-repository-setup)
3. [Step 2: Docker Setup](#step-2-docker-setup)
4. [Step 3: MongoDB Atlas Setup](#step-3-mongodb-atlas-setup)
5. [Step 4: Deploy Backend to Render](#step-4-deploy-backend-to-render)
6. [Step 5: Deploy Frontend to Vercel](#step-5-deploy-frontend-to-vercel)
7. [Step 6: Environment Configuration](#step-6-environment-configuration)
8. [Step 7: Post-Deployment](#step-7-post-deployment)
9. [Troubleshooting](#troubleshooting)

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ GitHub account
- ✅ Docker Desktop installed (for local testing)
- ✅ Render account (free tier available)
- ✅ Vercel account (free tier available)
- ✅ MongoDB Atlas account (free tier available)
- ✅ Git installed locally
- ✅ Node.js v18+ installed (for local testing)

---

## 🔧 Step 1: Git Repository Setup

### 1.1 Initialize Git Repository

```bash
# Navigate to project directory
cd "C:\Users\aryab\Internship\Task Manager"

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: TaskFlow application"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon → **"New repository"**
3. Repository name: `taskflow` (or your preferred name)
4. Description: "Enterprise Task Management Application"
5. Set to **Private** (recommended) or **Public**
6. **Do NOT** initialize with README, .gitignore, or license
7. Click **"Create repository"**

### 1.3 Connect Local Repository to GitHub

```bash
# Add remote repository (replace with your GitHub username and repo name)
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### 1.4 Verify Push

- Go to your GitHub repository
- Verify all files are present
- Check that `.env` files are **NOT** in the repository (they should be in `.gitignore`)

---

## 🐳 Step 2: Docker Setup

### 2.1 Create Dockerfile for Backend

Create `server/Dockerfile`:

```dockerfile
# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "index.js"]
```

### 2.2 Create .dockerignore for Backend

Create `server/.dockerignore`:

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
```

### 2.3 Create Dockerfile for Frontend (Optional)

Create `Dockerfile` in root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2.4 Test Docker Locally (Optional)

```bash
# Build backend image
cd server
docker build -t taskflow-backend .

# Run backend container
docker run -p 5000:5000 \
  -e MONGO_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  taskflow-backend

# Test in another terminal
curl http://localhost:5000
```

---

## 🗄️ Step 3: MongoDB Atlas Setup

### 3.1 Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new organization (if prompted)

### 3.2 Create a Cluster

1. Click **"Build a Database"**
2. Choose **"M0 FREE"** tier
3. Select a cloud provider and region (closest to your users)
4. Click **"Create"**
5. Wait for cluster creation (~3-5 minutes)

### 3.3 Configure Database Access

1. Go to **"Database Access"** in left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `taskflow-admin` (or your choice)
5. Password: Generate a strong password (save it!)
6. Database User Privileges: **"Atlas admin"** (or **"Read and write to any database"**)
7. Click **"Add User"**

### 3.4 Configure Network Access

1. Go to **"Network Access"** in left sidebar
2. Click **"Add IP Address"**
3. For development: Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - **Note**: For production, add specific IPs only
4. Click **"Confirm"**

### 3.5 Get Connection String

1. Go to **"Database"** → Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `taskflow` (or your database name)

**Example connection string:**
```
mongodb+srv://taskflow-admin:<password>@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
```

---

## 🚀 Step 4: Deploy Backend to Render

### 4.1 Create Render Account

1. Go to [Render](https://render.com)
2. Sign up with GitHub (recommended) or email
3. Verify your email if required

### 4.2 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select the `taskflow` repository
4. Configure the service:

   **Basic Settings:**
   - **Name**: `taskflow-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

   **Environment Variables:**
   - Click **"Add Environment Variable"**
   - Add the following:
     ```
     PORT=5000
     MONGO_URI=<your_mongodb_atlas_connection_string>
     JWT_SECRET=<generate_a_strong_secret>
     NODE_ENV=production
     ```

   **Generate JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

### 4.3 Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Install dependencies
   - Start your application
3. Wait for deployment to complete (~2-5 minutes)
4. Once deployed, you'll get a URL like: `https://taskflow-backend.onrender.com`

### 4.4 Verify Backend Deployment

```bash
# Test the API
curl https://taskflow-backend.onrender.com

# Should return: "Task Manager API is running"
```

### 4.5 Configure Auto-Deploy

- By default, Render auto-deploys on every push to `main`
- You can disable this in **Settings** → **Auto-Deploy**

---

## 🌐 Step 5: Deploy Frontend to Vercel

### 5.1 Create Vercel Account

1. Go to [Vercel](https://vercel.com)
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your repositories

### 5.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Select your `taskflow` repository
3. Configure the project:

   **Framework Preset:**
   - **Framework Preset**: `Vite`
   - Vercel will auto-detect this

   **Build Settings:**
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

   **Environment Variables:**
   - Click **"Add"** and add:
     ```
     VITE_API_URL=https://taskflow-backend.onrender.com/api
     ```
   - **Important**: Replace with your actual Render backend URL

### 5.3 Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Build the application
   - Deploy to production
3. Wait for deployment (~2-3 minutes)
4. You'll get a URL like: `https://taskflow.vercel.app`

### 5.4 Verify Frontend Deployment

1. Open the Vercel URL in your browser
2. You should see the TaskFlow login page
3. Try logging in (you'll need to create a user first via registration)

### 5.5 Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

---

## ⚙️ Step 6: Environment Configuration

### 6.1 Backend Environment Variables (Render)

Go to Render Dashboard → Your Service → **Environment**:

```
PORT=5000
MONGO_URI=mongodb+srv://taskflow-admin:<password>@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
JWT_SECRET=<your_generated_secret>
NODE_ENV=production
```

### 6.2 Frontend Environment Variables (Vercel)

Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**:

```
VITE_API_URL=https://taskflow-backend.onrender.com/api
```

**Important**: After adding environment variables, **redeploy** the service:
- **Render**: Go to **Manual Deploy** → **Deploy latest commit**
- **Vercel**: Go to **Deployments** → Click **"..."** → **Redeploy**

---

## ✅ Step 7: Post-Deployment

### 7.1 Create First User

1. Open your Vercel frontend URL
2. Click **"Register"** or navigate to registration
3. Create a Super Admin account:
   - Email: `admin@yourcompany.com`
   - Role: `super_admin`
   - Fill in other required fields

### 7.2 Test Application

1. **Login**: Test login functionality
2. **Dashboard**: Verify statistics load
3. **Tasks**: Create a test task
4. **Team**: Add team members
5. **Notifications**: Verify notifications work

### 7.3 Monitor Deployments

**Render:**
- Go to **Logs** tab to view server logs
- Monitor **Metrics** for CPU, Memory usage

**Vercel:**
- Go to **Deployments** to see build logs
- Check **Analytics** for performance metrics

### 7.4 Set Up Monitoring (Optional)

- **Uptime Monitoring**: Use services like UptimeRobot or Pingdom
- **Error Tracking**: Integrate Sentry for error monitoring
- **Analytics**: Add Google Analytics or similar

---

## 🔍 Troubleshooting

### Backend Issues

#### Issue: "Cannot connect to MongoDB"
**Solution:**
- Verify MongoDB Atlas connection string
- Check Network Access settings (allow 0.0.0.0/0 for testing)
- Ensure database user password is correct
- Check Render logs for detailed error messages

#### Issue: "JWT_SECRET is not configured"
**Solution:**
- Add `JWT_SECRET` environment variable in Render
- Generate a new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Redeploy the service

#### Issue: "Port already in use"
**Solution:**
- Render automatically assigns a port via `PORT` environment variable
- Ensure your code uses `process.env.PORT || 5000`

### Frontend Issues

#### Issue: "API requests failing"
**Solution:**
- Verify `VITE_API_URL` in Vercel environment variables
- Check CORS settings in backend (should allow Vercel domain)
- Check browser console for CORS errors
- Ensure backend is deployed and running

#### Issue: "Build fails on Vercel"
**Solution:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check for TypeScript errors locally first

### Database Issues

#### Issue: "Database connection timeout"
**Solution:**
- Check MongoDB Atlas cluster status
- Verify network access IP whitelist
- Check connection string format
- Ensure cluster is not paused (free tier pauses after inactivity)

### General Issues

#### Issue: "Environment variables not updating"
**Solution:**
- **Render**: Redeploy after adding/changing variables
- **Vercel**: Redeploy after adding/changing variables
- Clear browser cache
- Check variable names (case-sensitive)

#### Issue: "Deployment takes too long"
**Solution:**
- Render free tier has cold starts (first request after inactivity)
- Consider upgrading to paid tier for faster response
- Use Render's "Always On" feature (paid)

---

## 📝 Deployment Checklist

Before going live, ensure:

- [ ] All environment variables are set
- [ ] MongoDB Atlas cluster is running
- [ ] Backend is deployed and accessible
- [ ] Frontend is deployed and accessible
- [ ] CORS is configured correctly
- [ ] First user (Super Admin) is created
- [ ] SSL/HTTPS is enabled (automatic on Render/Vercel)
- [ ] Error monitoring is set up (optional)
- [ ] Backup strategy is in place
- [ ] Documentation is updated with production URLs

---

## 🔐 Security Best Practices

1. **Never commit secrets** to Git
2. **Use strong JWT secrets** (64+ characters)
3. **Restrict MongoDB network access** to specific IPs in production
4. **Enable MongoDB authentication** (already done)
5. **Use HTTPS only** (automatic on Render/Vercel)
6. **Regular security updates** for dependencies
7. **Monitor logs** for suspicious activity
8. **Backup database** regularly

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Docker Documentation](https://docs.docker.com)

---

## 🎉 Success!

Your TaskFlow application is now deployed and ready to use!

**Frontend URL**: `https://your-app.vercel.app`  
**Backend URL**: `https://your-backend.onrender.com`

For support or questions, refer to:
- [PROJECT_FLOW.md](./PROJECT_FLOW.md) - Architecture documentation
- [README.md](./README.md) - General documentation

---

**Happy Deploying! 🚀**
