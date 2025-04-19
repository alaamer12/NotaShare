# 📝 NotaShare

A fully functional, modern, sleek, and responsive web application for creative, freeform note-taking — built with **React**, **Tailwind CSS**, and **IndexedDB** for persistent, local-first storage.

## ✨ Features

### 🖼️ Notes Canvas  
- Infinite, drag-and-drop **canvas** for placing and moving text boxes anywhere.  
- Rich-text formatting: **bold**, _italic_, lists, and headings supported within text boxes.  
- **Pen tool**: freehand drawing with adjustable color and stroke width.  
- Touch & mouse friendly.

### 🗂 Notes Management  
- `+ New Note` creates a new canvas instantly.  
- **Auto-saving**: every edit is saved automatically in **IndexedDB** as a unique versioned snapshot.  
- **Immutable history**: no deletions — every version is kept for transparency and traceability.  
- Revisit or edit any previous version, and your edits are saved as new history entries.

### 👤 Users & Identification  
- No login or signup required.  
- Each browser is assigned a unique ID using local fingerprinting + UUID.  
- **Random avatar** generated per device (e.g., [Dicebear](https://dicebear.com/)) and persisted locally.  
- Header displays:
  - 👤 “Created by” avatar + user ID + timestamp  
  - 🛠 “Last modified by” avatar + user ID + timestamp  
- Tracks and displays the number of **unique users** who have used NotaShare (locally stored counter).

### 🧭 Sidebar & History  
- A collapsible **sidebar** with a scrollable list of all saved notes (most recent first).  
- Each note entry includes:  
  - 📸 Thumbnail snapshot  
  - 🕒 Creation & last-modified timestamps  
  - 👤 Creator's avatar  
- Click on a note to instantly load it back into the canvas for viewing or editing.

### 📱 Responsive & Accessible  
- Fully responsive across **Desktop**, **Tablet**, and **Mobile** layouts.  
- Keyboard-accessible controls for navigation and text editing.  
- Accessible design with **high contrast**, **readable fonts**, and thoughtful focus management.

---

## 🛠 Tech Stack

- **Frontend**: React, Tailwind CSS  
- **Persistence**: IndexedDB via local storage APIs  
- **Drawing & Canvas**: HTML Canvas API  
- **Avatars**: [Dicebear](https://dicebear.com/) or similar  
- **Browser Fingerprinting**: Local-only, privacy-respecting solution for user identification

---

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 20)
- bun / npm

### Installation
```bash
git clone https://github.com/yourusername/notashare.git
cd notashare
bun install
# or npm install
```

### Development
```bash
bun dev
# or npm run dev
```

### Build for Production
```bash
bun build
# or npm run build
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change.  
Don’t forget to ⭐ the project if you like it!

---

## 📄 License

MIT License — [see the license file](LICENSE) for details.

---

## 🙌 Acknowledgements

- [Dicebear Avatars](https://dicebear.com/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [idb](https://github.com/jakearchibald/idb) – Friendly IndexedDB wrapper
