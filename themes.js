// Theme definitions for yxorp mini-utilities

function generateThemeCSS(themeName) {
  if (themeName === 'beyondcool') {
    return `
:root {
  --bg: #000;
  --text: rgb(255, 60, 0);
  --text-shadow: 0 0 1em rgb(255, 60, 0);
  --text-secondary: rgba(255, 60, 0, 0.6);
  --text-tertiary: rgba(255, 60, 0, 0.3);
  --border: rgb(255, 60, 0);
  --border-focus: rgb(255, 187, 0);
  --button-bg: rgb(255, 60, 0);
  --button-text: #000;
  --button-hover-bg: rgb(255, 187, 0);
  --button-shadow: 0 0 1em rgb(255, 60, 0);
  --secondary-bg: #000;
  --secondary-border: rgb(255, 60, 0);
  --secondary-hover-bg: #111;
  --secondary-hover-border: rgb(255, 187, 0);
  --delete-hover-color: rgb(255, 0, 0);
  --error-color: rgb(255, 0, 0);
}
    `;
  }
  
  if (themeName === 'warm') {
    return `
:root {
  --bg: #fdf6e3;
  --text: #5c4742;
  --text-shadow: none;
  --text-secondary: #8b7355;
  --text-tertiary: #a89984;
  --border: #d4c4b0;
  --border-focus: #8b7355;
  --button-bg: #d2691e;
  --button-text: #fff;
  --button-hover-bg: #a0522d;
  --button-shadow: none;
  --secondary-bg: #f5ede1;
  --secondary-border: #d4c4b0;
  --secondary-hover-bg: #ebe2d5;
  --secondary-hover-border: #8b7355;
  --delete-hover-color: #c73e1d;
  --error-color: #c73e1d;
}
    `;
  }
  
  if (themeName.startsWith('hue')) {
    const hue = parseInt(themeName.substring(3));
    if (!isNaN(hue) && hue >= 0 && hue <= 360) {
      return `
:root {
  --bg: hsl(${hue}, 30%, 97%);
  --text: hsl(${hue}, 30%, 20%);
  --text-shadow: none;
  --text-secondary: hsl(${hue}, 20%, 40%);
  --text-tertiary: hsl(${hue}, 15%, 60%);
  --border: hsl(${hue}, 20%, 80%);
  --border-focus: hsl(${hue}, 40%, 50%);
  --button-bg: hsl(${hue}, 50%, 35%);
  --button-text: #fff;
  --button-hover-bg: hsl(${hue}, 50%, 25%);
  --button-shadow: none;
  --secondary-bg: hsl(${hue}, 25%, 95%);
  --secondary-border: hsl(${hue}, 20%, 80%);
  --secondary-hover-bg: hsl(${hue}, 20%, 92%);
  --secondary-hover-border: hsl(${hue}, 40%, 50%);
  --delete-hover-color: hsl(0, 70%, 50%);
  --error-color: hsl(0, 70%, 50%);
}
      `;
    }
  }
  
  return '';
}

module.exports = { generateThemeCSS };

