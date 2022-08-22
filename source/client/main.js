const socket = io(); 

const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get('id');
const id = Math.floor(Math.random() * 100000)

var mouseIsDown = false;
var clickedElement = undefined;

window.addEventListener('mousedown', function(e) {
  clickedElement = e.target;
  mouseIsDown = true;
});

window.addEventListener('mouseup', function(e) {
  mouseIsDown = false;
});

let mouseColor = "hsl(" + Math.floor(Math.random() * 360) + ", 100%, 50%, 0.5"
let color = mouseColor.slice(0, -5);
console.log(color)
document.getElementById("colorPick").value = hslToHex(color.split("(")[1].split(",")[0], 100, 50) ;

var code;

if (myParam != null) {
    socket.emit("join", myParam);
    document.getElementById("share-link").innerText = window.location.href.split("?")[0] +"?id="+ myParam
} else {
    socket.emit("create")
    socket.on("create_res", (res) => {
        code = res.id;
        window.history.pushState("object or string", "Title", "/?id=" + res.id);
        document.getElementById("share-link").innerText = window.location.href.split("?")[0] +"?id="+ code
    })
}
socket.on("strokes", (strokes) => {
    incomingStrokes[strokes.id] = strokes.strokes;

})
socket.on("mouse", (mouse) => {
    mice[mouse.id] = mouse;

})

socket.on("reset", () => {
    strokes.splice(0, strokes.length);
    incomingStrokes = {};
})



var ctx = document.getElementById("main").getContext("2d");

function draw() {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';

    for (let strokee of Object.keys(incomingStrokes)) {
        if (strokee == id) {
            continue;
        }
        strokee = incomingStrokes[strokee];
        for (let stroke of strokee) {
            for (let i = 1; i < stroke.length; i++) {
                let p = stroke[i - 1];
                let c  = stroke[i];
                ctx.strokeStyle = p[2]
                ctx.beginPath()
                ctx.moveTo(p[0], p[1])
                ctx.lineTo(c[0], c[1])
                ctx.stroke()
            }
        }
    }

    for (let stroke of strokes) {
        for (let i = 1; i < stroke.length; i++) {
            let p = stroke[i - 1];
            let c  = stroke[i];
            ctx.strokeStyle = p[2]
            ctx.beginPath()
            ctx.moveTo(p[0], p[1])
            ctx.lineTo(c[0], c[1])
            ctx.stroke()
        }
    }


    for (let i = 1; i < currentStroke.length; i++) {
        let p = currentStroke[i - 1];
        let c  = currentStroke[i];
        ctx.strokeStyle = p[2]
        ctx.beginPath()
        ctx.moveTo(p[0], p[1])
        ctx.lineTo(c[0], c[1])
        ctx.stroke()
    }

    for (let mouseKey of Object.keys(mice)) {
        if (mouseKey == id) {
            continue;
        }
        let mouse = mice[mouseKey].mouse;

        ctx.beginPath();
        ctx.arc(mouse[0], mouse[1], 8, 0, 2 * Math.PI, false);
        ctx.fillStyle = mice[mouseKey].color;
        ctx.fill();
        // ctx.lineWidth = 5;
        // ctx.strokeStyle = '#003300';
        // ctx.stroke();
    }
    // ctx.fillRect(50, 50, 50, 50)
}
// draw();
setInterval(draw, 16)

let strokes = []
let currentStroke = []
let undoneStrokes = []
let incomingStrokes = {};
let mice = {};

// MOUSE STUFF
let held = false;
document.body.addEventListener("mousedown", (e) => {
    held = true;
})

let pX = null;
let pY = null;
document.body.addEventListener("mousemove", (e) => {

    if (clickedElement.id != "main"){
        return;
    }

    let mousePos = getMousePos(document.getElementById("main"), e);

    if (held) {
        currentStroke.push([mousePos.x, mousePos.y, color])
    }

    socket.emit("mouse", {
        "mouse":[mousePos.x, mousePos.y],
        "id":id,
        "color": mouseColor
        })
})

document.body.addEventListener("mouseup", (e) => {
    held = false;
    let pX = null;
    let pY = null;
    strokes.push([...currentStroke]);
    currentStroke.splice(0, currentStroke.length);
    socket.emit("strokes", {
        "strokes" : strokes,
        "id" : id
    });
})

document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'z') {
        undoneStrokes.push(strokes.pop());
        socket.emit("strokes", {
            "strokes" : strokes,
            "id" : id
        });
    }
    if (event.ctrlKey && event.key === 'y') {
        strokes.push(undoneStrokes.pop());
        socket.emit("strokes", {
            "strokes" : strokes,
            "id" : id
        });
    }
});

window.onbeforeunload = function () {
    socket.emit("mouse", {
        "mouse":[-100000, -100000],
        "id":id,
        "color": mouseColor
        })
}

document.getElementById("colorPick").addEventListener("change", (e) => {
    color = e.target.value;
})

function reset() {
    socket.emit("reset")
}


window.addEventListener("beforeunload", function (e) {
    console.log(socket);
    socket.emit("mouse", {
        "mouse":[-500, -500],
        "id":id,
        "color": mouseColor
        })
    // var confirmationMessage = 'It looks like you have been editing something. '
    //                         + 'If you leave before saving, your changes will be lost.';

    // (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    // return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});

// https://stackoverflow.com/questions/36721830/convert-hsl-to-rgb-and-hex
// Thanks icl7126!
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function  getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for x
      scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for y
  
    return {
      x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
      y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    }
  }


  function onStickyDrag(e) {
    if (mouseIsDown && clickedElement.classList.contains("postitHeader")) {
        clickedElement.parentElement.style.left = (e.clientX - (280/2)) + "px";
        clickedElement.parentElement.style.top = (e.clientY - 5) + "px";

    }
  }

  function deletePostIt(e) {
    clickedElement.parentElement.parentElement.parentElement.remove();
  }