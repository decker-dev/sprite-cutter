# Sprite Cutter

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://sprite-cutter.vercel.app)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## 🎮 Overview

**Sprite Cutter** is a free, web-based tool designed for game developers and digital artists to easily extract individual sprites from sprite sheets. Upload your image, mark the areas you want to cut, preview your selections, and download all sprites as separate files.

Perfect for:
- Game developers working with sprite sheets
- Digital artists organizing their artwork
- Pixel art enthusiasts
- Anyone needing to split images into smaller components

## ✨ Features

- **🖼️ Image Upload**: Support for PNG, JPG, JPEG, and GIF formats
- **✂️ Interactive Cutting**: Click and drag to select sprite areas
- **👁️ Live Preview**: See your selected areas in real-time
- **📦 Batch Download**: Download all sprites as a ZIP file
- **🎨 Visual Feedback**: Clear visual indicators for selected areas
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🚀 Fast Performance**: Client-side processing for instant results
- **🔒 Privacy First**: All processing happens in your browser

## 🚀 Live Demo

Visit the live application: **[https://sprite-cutter.vercel.app](https://sprite-cutter.vercel.app)**

## 🛠️ Technology Stack

- **Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components
- **Image Processing**: HTML5 Canvas API
- **File Handling**: Browser File API
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sprite-cutter.git
cd sprite-cutter
```

2. Install dependencies:
```bash
# Using bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install

# Or using pnpm
pnpm install
```

3. Run the development server:
```bash
# Using bun
bun dev

# Or using npm
npm run dev

# Or using yarn
yarn dev

# Or using pnpm
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How to Use

1. **Upload an Image**: Click the upload area or drag and drop your sprite sheet
2. **Select Areas**: Click and drag on the image to mark sprite boundaries
3. **Preview Sprites**: View your selected areas in the preview section
4. **Download**: Click "Download All Sprites" to get a ZIP file with all your sprites

## 🏗️ Project Structure

```
sprite-cutter/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout with metadata
│   └── page.tsx             # Main application page
├── public/                  # Static assets
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## 🔧 Available Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [v0.dev](https://v0.dev) for rapid prototyping
- Deployed on [Vercel](https://vercel.com) for seamless hosting
- Icons and UI inspiration from modern design systems

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Visit the [live demo](https://sprite-cutter.vercel.app)
- Check the documentation above

---

Made with ❤️ for the game development community