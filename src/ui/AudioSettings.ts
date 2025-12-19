export const AudioSettings = {
  master: 0.5,
  music: 0.5,
  sfx: 0.5,

  load() {
    const saved = localStorage.getItem("audioSettings");
    if (saved) Object.assign(this, JSON.parse(saved));
  },

  save() {
    localStorage.setItem("audioSettings", JSON.stringify({
      master: this.master,
      music: this.music,
      sfx: this.sfx,
    }));
  }
};