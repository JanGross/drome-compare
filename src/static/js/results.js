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

function handleOverride(select) {
    console.log(select.attributes["album-id"].value);
    console.log(select.value);
    fetch('/overrideStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumID: select.attributes["album-id"].value,
          status: select.value
        })
      })
      .then(response => response.json())
      .then(data => {
        data = JSON.parse(data);
        document.getElementById(`icon_${data['result']['albumID']}`).classList.add('override');
        document.getElementById(`symbol_${data['result']['albumID']}`).innerText = data['result']['symbol'];
      })
      .catch((error) => console.error('Error:', error));
}

function handleComment(button) {
  let albumID = button.attributes['album-id'].value;
  let commentStr = document.getElementById(`comment_${albumID}`).value;
  console.log(`Sending comment for ${albumID}: ${commentStr}`);
  fetch('/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        albumID: albumID,
        comment: commentStr
      })
    })
    .then(response => response.json())
    .then(data => {
      data = JSON.parse(data);
      console.log(data);
    })
    .catch((error) => console.error('Error:', error));
}