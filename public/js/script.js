// Setting config and global vars
const socket = io("/");
const videoGrid = document.getElementById("video-grid");
var myUserId = "";
var USERNAME = "";
var tries = 0;
var usersArr;
var chatArr = [];

// Setting/checking localstorage form username
if (localStorage.getItem("meetUserName")) {
  USERNAME = localStorage.getItem("meetUserName");

  socket.emit("addUserToList", USERNAME, ROOM_ID);
  // console.log("test");
} else {
  $("#usernameInputModal").modal(
    { keyboard: false, backdrop: "static" },
    "show"
  );
  $("#usernameSubmitBtn").click(function () {
    tries++;
    if (tries > 3) {
      alert("Sorry you didn't enter your username properly...");
      window.location.href = "/exit";
      return;
    }
    if (document.getElementById("usernameInput").value.length > 0) {
      USERNAME = document.getElementById("usernameInput").value;
      USERNAME = USERNAME.trim().replace(/ +/g, "-");

      localStorage.setItem(
        "meetUserName",
        document.getElementById("usernameInput").value
      );

      $("#usernameInputModal").modal("hide");

      socket.emit("addUserToList", USERNAME, ROOM_ID);
    } else {
      alert("Enter valid username...");
    }
  });
}

// Establishing peer
const myPeer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: PORT,
});

// Setting stream vars
let myVideoStream;
const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {};

// var colors = ["red", "green", "blue", "yellow", "orange", "pink"];
var colors = ["#0078ff", "#bd00ff", "#ff9a00", "#00811f", "#e70000"];

// Streaming my own audio/video
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);
    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    // User connected
    socket.on("user-connected", (userId) => {
      myUserId = userId;
      connectToNewUser(userId, stream);
    });

    // Chat message

    // input value
    let text_modal = $("#chat_message");
    // when press enter send message
    $("#chat_message").keydown(function (e) {
      if (e.which == 13 && text_modal.val().length !== 0) {
        socket.emit("message", {
          username: USERNAME,
          message: text_modal.val(),
        });
        text_modal.val("");
      }
    });

    let text = $("#chat_message_modal");
    // when press enter send message
    $("#chat_message_modal").keydown(function (e) {
      if (e.which == 13 && text.val().length !== 0) {
        socket.emit("message", { username: USERNAME, message: text.val() });
        text.val("");
      }
    });

    // Adding new chat message
    socket.on("createMessage", (messageObj) => {
      chatArr.push(messageObj);
      $(".messages").append(
        `<li class="message ${messageObj.username}"><b>${messageObj.username}</b>: ${messageObj.message}</li>`
      );
      scrollToBottom();
      usersArr.forEach(function (user, idx) {
        $("." + user.username).css(
          "background-color",
          colors[idx % colors.length]
        );
      });
    });
  });

socket.on("roomUsers", (users) => {
  // console.log(users);
  displayUsers(users);
});

// User diconnected
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

// Opening peer
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

// Connecting new user
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

// Adding new stream
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.setAttribute("data-stream", stream.id);
  video.addEventListener("click", videoClicked);
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Scroll to bottom function
const scrollToBottom = () => {
  var d = $(".main__chat_window");
  d.scrollTop(d.prop("scrollHeight"));
  var d1 = $("#chat_modal_body");
  d1.scrollTop(d1.prop("scrollHeight"));
};

// mute/unmute handler function
const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;

  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

// play/stop function
const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

// exit handler function
const exit = () => {
  window.location.href = "/exit";
};

// copy handler function
const copyInfo = () => {
  navigator.clipboard.writeText(window.location.href);
};

const chatPop = () => {
  $("#chatModal").modal("show");
  var d = $("#chat_modal_body");
  d.scrollTop(d.prop("scrollHeight"));
};

// share screen handler function
const shareScreen = async () => {
  let captureStream = null;

  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia();
  } catch (err) {
    console.error("Error: " + err);
  }
  // connectToNewUser(myUserId, captureStream);
  myPeer.call(myUserId, captureStream);
  const video = document.createElement("video");
  addVideoStream(video, captureStream);
};

// mute icon change handler function
const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone" style="padding-left: 6px; padding-right: 6px;"></i>
  `;

  // for main
  document.getElementsByClassName("main__mute_button")[0].innerHTML = html;
  document.getElementsByClassName(
    "main__mute_button"
  )[0].style.backgroundColor = "#e8e8e8";
  document.getElementsByClassName("main__mute_button")[0].style.color = "white";
  document.getElementsByClassName(
    "main__mute_button"
  )[0].style.backgroundColor = "";

  // for nav
  document.getElementsByClassName("main__mute_button")[1].innerHTML = html;
  document.getElementsByClassName(
    "main__mute_button"
  )[1].style.backgroundColor = "#e8e8e8";
  document.getElementsByClassName("main__mute_button")[1].style.color = "white";
  document.getElementsByClassName(
    "main__mute_button"
  )[1].style.backgroundColor = "";

  $(".main__controls__block .main__mute_button")
    .tooltip("hide")
    .attr("data-original-title", "Mute yourself");
  // .tooltip("show");
};

// unmute icon change handler function
const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash" style="font-size: 23px"></i>
  `;

  // for main
  document.getElementsByClassName("main__mute_button")[0].innerHTML = html;
  document.getElementsByClassName(
    "main__mute_button"
  )[0].style.backgroundColor = "red";
  document.getElementsByClassName("main__mute_button")[0].style.color = "white";

  // for nav
  document.getElementsByClassName("main__mute_button")[1].innerHTML = html;
  document.getElementsByClassName(
    "main__mute_button"
  )[1].style.backgroundColor = "red";
  document.getElementsByClassName("main__mute_button")[1].style.color = "white";

  $(".main__controls__block .main__mute_button")
    .tooltip("hide")
    .attr("data-original-title", "Unmute yourself");
  // .tooltip("show");
};

// video pause icon change handler function
const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
  `;

  // for main
  document.getElementsByClassName("main__video_button")[0].innerHTML = html;
  document.getElementsByClassName(
    "main__video_button"
  )[0].style.backgroundColor = "#e8e8e8";
  document.getElementsByClassName("main__video_button")[0].style.color =
    "white";
  document.getElementsByClassName(
    "main__video_button"
  )[0].style.backgroundColor = "";

  // for nav
  document.getElementsByClassName("main__video_button")[1].innerHTML = html;
  document.getElementsByClassName(
    "main__video_button"
  )[1].style.backgroundColor = "#e8e8e8";
  document.getElementsByClassName("main__video_button")[1].style.color =
    "white";
  document.getElementsByClassName(
    "main__video_button"
  )[1].style.backgroundColor = "";

  $(".main__video_button")
    .tooltip("hide")
    .attr("data-original-title", "Turn off your video");
  // .tooltip("show");
};

// video play icon change handler function
const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash" style="font-size: 21px"></i>
  `;

  // for main
  document.getElementsByClassName("main__video_button")[0].innerHTML = html;
  document.getElementsByClassName(
    "main__video_button"
  )[0].style.backgroundColor = "red";
  document.getElementsByClassName("main__video_button")[0].style.color =
    "white";

  // for nav
  document.getElementsByClassName("main__video_button")[1].innerHTML = html;
  document.getElementsByClassName(
    "main__video_button"
  )[1].style.backgroundColor = "red";
  document.getElementsByClassName("main__video_button")[1].style.color =
    "white";

  $(".main__video_button")
    .tooltip("hide")
    .attr("data-original-title", "Turn on your video");
  // .tooltip("show");
};

// Display user handler function
const displayUsers = (users) => {
  // console.log(users);
  usersArr = users;

  participants_str = "";
  users.forEach(function (user) {
    participants_str +=
      '<span class="' +
      user.username +
      '">' +
      user.username +
      "</span> &bull; ";
  });
  participants_str = participants_str.slice(0, participants_str.length - 8);

  document.getElementsByClassName(
    "main__participants_list"
  )[0].innerHTML = participants_str;
  document.getElementsByClassName(
    "main__participants_list"
  )[1].innerHTML = participants_str;
};

// Full screen video handler function
const videoClicked = (e) => {
  // console.log(e.target.srcObject);
  const fullScreenVideo = document.getElementById("fullScreenVideo");
  fullScreenVideo.srcObject = e.target.srcObject;
  if (myVideoStream.id === e.target.srcObject.id) {
    fullScreenVideo.muted = true;
  } else {
    fullScreenVideo.muted = false;
  }
  $("#videoModal").modal({ keyboard: false, backdrop: "static" }, "show");

  fullScreenVideo.addEventListener("loadedmetadata", () => {
    fullScreenVideo.play();
  });

  // e.target.muted = true;
  e.target.pause();
};

// full screen close handler function
$("#videoModal").on("hide.bs.modal", function (e) {
  const fullScreenVideoStream = document.getElementById("fullScreenVideo")
    .srcObject.id;
  document.getElementById("fullScreenVideo").pause();
  // document.getElementById("fullScreenVideo").muted = true;
  document.getElementById("fullScreenVideo").srcObject = null;
  // if (myVideoStream.id === fullScreenVideoStream) {
  //   $(`video[data-stream=${fullScreenVideoStream}]`).prop("muted", true);
  // } else {
  //   $(`video[data-stream=${fullScreenVideoStream}]`).prop("muted", false);
  // }
  $(`video[data-stream="${fullScreenVideoStream}"]`).trigger("play");
});

var floatNav = $(".float-nav"),
  mainContent = $(".main-content");

floatNav.on("click", function (e) {
  $(this).toggleClass("closed");
  e.stopPropagation();
  e.preventDefault();

  var overlayDisplay = $("#overlay").css("display");
  if (overlayDisplay == "block")
    document.getElementById("overlay").style.display = "none";
  else if (overlayDisplay == "none")
    document.getElementById("overlay").style.display = "block";
});

mainContent.on("click", function () {
  if (!floatNav.hasClass("closed")) floatNav.addClass("closed");
});

function offOverlay() {
  document.getElementById("overlay").style.display = "block";
}
