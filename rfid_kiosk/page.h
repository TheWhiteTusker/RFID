#pragma once
// The kiosk shell served at http://<esp-ip>/ . It polls /current and points an
// iframe at the showcase; serving it ourselves means no CORS anywhere.
// Kept out of the .ino so the sketch stays readable.

const char KIOSK_PAGE[] PROGMEM = R"rawliteral(

<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8">
<title>Lattice Lane</title>

<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600&display=swap" rel="stylesheet">

<style>

body {
  margin: 0;
  background: #FAF8EE;
  color: #54655B;
  font-family: Archivo, system-ui, sans-serif;
}

/* Idle attract screen — what the stall shows most of the time. */
#idle {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 28px;
  text-align: center;
}

#idle .mark {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: .38em;
  text-transform: uppercase;
  color: #3D4A43;
}

#idle .rule {
  width: 56px;
  height: 1px;
  background: rgba(84, 101, 91, .25);
}

#idle .cue {
  font-size: 12px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: #7B7B7B;
  animation: breathe 2.6s ease-in-out infinite;
}

@keyframes breathe {
  50% { opacity: .35 }
}

iframe {
  width: 100vw;
  height: 100vh;
  border: none;
  display: none;
}

</style>

</head>

<body>

<div id="idle">
  <div class="mark">Lattice Lane</div>
  <div class="rule"></div>
  <div class="cue">Tap a product to begin</div>
</div>

<iframe id="content"></iframe>

<script>

let previousURL = "";

setInterval(async () => {

  try {

    const response = await fetch('/current');

    const url = await response.text();

    if (url === previousURL) {
      return;
    }

    previousURL = url;


    // Empty means no tag has been read yet, or the rig was reset.
    document.getElementById("idle").style.display = url === "" ? "grid" : "none";
    document.getElementById("content").style.display = url === "" ? "none" : "block";

    if (url !== "") {
      document.getElementById("content").src = url;
    }

  }

  catch (error) {

    console.log(error);

  }

}, 300);

</script>

</body>

</html>

)rawliteral";
