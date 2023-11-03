let serviceIcons = document.querySelectorAll(".albumLinks a");
for (let icon of serviceIcons) {
    let mode = icon.classList.contains('spotify') ? 'full-cut' : 'no-cut';
    icon.addEventListener("mouseover", function(event) {
        event.target.closest('.result').querySelector(`.cover.subsonic`).classList.add(mode);
        event.target.closest('.result').querySelector('.cover.subsonic').classList.remove('half-cut');
    });
    icon.addEventListener("mouseout", function(event) {
        event.target.closest('.result').querySelector('.cover.subsonic').classList.add('half-cut');
        event.target.closest('.result').querySelector('.cover.subsonic').classList.remove(mode);
    });

}