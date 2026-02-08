# 🎤 Karaoke Generator

A modern, AI-powered Karaoke Generator that transforms any YouTube video into a synchronized karaoke experience. Built with Next.js, Framer Motion, and LRClib.

https://karaoke-generator-pytglq7av-damiens-projects-1d0dd317.vercel.app/

## ✨ Features

- **🔍 Smart Search**: Instantly find songs via YouTube.
- **🎵 Auto-Sync Lyrics**: Fetches synchronized lyrics from LRClib automatically.
- **🎨 Dynamic UI**: 
  - **Glassmorphism Design**: Sleek, modern interface with blur effects.
  - **Reactive Background**: Particles and pulses that react to the music's rhythm.
  - **Fluid Lyrics**: Smooth "evaporation" animation for lyric transitions.
- **⚡ Real-time Control**:
  - Play/Pause, Seek, Volume controls.
  - **Offset Adjustment**: Manually tweak lyric timing if needed.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/karaoke-generator.git
    cd karaoke-generator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

4.  **Open your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000) to start singing!

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS + Custom CSS Variables
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Player**: `react-youtube` wrapper for YouTube IFrame API
- **Lyrics Source**: [LRClib API](https://lrclib.net/)
- **Audio Processing**: `ytdl-core` for server-side metadata fetching

## 🔒 Security & Deployment

- **No API Keys**: This project uses public APIs and requires no secret keys to get started.
- **Deployment**: Easily deployable to Vercel or Netlify.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
