var audioCtx = null
var test = document.getElementById('test')
test.addEventListener('click', function () {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    audioCtx = new(window.AudioContext ||
        window.AudioContext ||
        window.webkitAudioContext)()
    console.log(audioCtx)
    test.setAttribute('disabled', 'disabled')
    var voiceSelect = document.getElementById('voice');
    var source;
    var stream;
    var mute = document.querySelector('.mute');
    console.log(navigator);
    console.log(voiceSelect);
    console.log(mute);
    var analyser = audioCtx.createAnalyser();
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    var distortion = audioCtx.createWaveShaper();
    var gainNode = audioCtx.createGain();
    var biquadFilter = audioCtx.createBiquadFilter();
    var convolver = audioCtx.createConvolver();

    function makeDistortionCurve(amount) {
        var k = typeof amount === 'number' ? amount : 50,
            n_samples = 44100,
            curve = new Float32Array(n_samples),
            deg = Math.PI / 180,
            i = 0,
            x;
        for (; i < n_samples; ++i) {
            x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    };

    var soundSource, concertHallBuffer;
    ajaxRequest = new XMLHttpRequest();
    ajaxRequest.open('GET', 'https://mdn.github.io/voice-change-o-matic/audio/concert-crowd.ogg', true);
    ajaxRequest.responseType = 'arraybuffer';
    ajaxRequest.onload = function () {
        var audioData = ajaxRequest.response;
        audioCtx.decodeAudioData(audioData, function (buffer) {
            concertHallBuffer = buffer;
            soundSource = audioCtx.createBufferSource();
            soundSource.buffer = concertHallBuffer;
        }, function (e) {
            "Error with decoding audio data" + e.err
        });
    }
    ajaxRequest.send();
    var canvas = document.querySelector('.visualizer');
    var canvasCtx = canvas.getContext("2d");
    var intendedWidth = document.querySelector('.wrapper').clientWidth;
    canvas.setAttribute('width', intendedWidth);
    var visualSelect = document.getElementById("visual");
    var drawVisual;
    if (navigator.getUserMedia) {
        console.log('getUserMedia supported.');
        navigator.getUserMedia({
                audio: true
            },
            function (stream) {
                source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.connect(distortion);
                distortion.connect(biquadFilter);
                biquadFilter.connect(convolver);
                convolver.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                visualize();
                voiceChange();
            },
            function (err) {
                console.log('The following gUM error occured: ' + err);
            }
        );
    } else {
        console.log('getUserMedia not supported on your browser!');
    }

    function visualize() {
        WIDTH = canvas.width;
        HEIGHT = canvas.height;
        var visualSetting = visualSelect.value;
        console.log(visualSetting);
        if (visualSetting == "sinewave") {
            analyser.fftSize = 1024;
            var bufferLength = analyser.fftSize;
            console.log(bufferLength);
            var dataArray = new Float32Array(bufferLength);

            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

            function draw() {

                drawVisual = requestAnimationFrame(draw);

                analyser.getFloatTimeDomainData(dataArray);

                canvasCtx.fillStyle = 'rgb(200, 200, 200)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

                canvasCtx.beginPath();

                var sliceWidth = WIDTH * 1.0 / bufferLength;
                var x = 0;

                for (var i = 0; i < bufferLength; i++) {

                    var v = dataArray[i] * 200.0;
                    var y = HEIGHT / 2 + v;

                    if (i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                canvasCtx.lineTo(canvas.width, canvas.height / 2);
                canvasCtx.stroke();
            };

            draw();

        } else if (visualSetting == "frequencybars") {
            analyser.fftSize = 256;
            var bufferLength = analyser.frequencyBinCount;
            console.log(bufferLength);
            var dataArray = new Float32Array(bufferLength);

            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

            function draw() {
                drawVisual = requestAnimationFrame(draw);
                analyser.getFloatFrequencyData(dataArray);
                canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                var barWidth = (WIDTH / bufferLength) * 2.5;
                var barHeight;
                var x = 0;
                for (var i = 0; i < bufferLength; i++) {
                    barHeight = (dataArray[i] + 140) * 2;
                    canvasCtx.fillStyle = 'rgb(' + Math.floor(barHeight + 100) + ',50,50)';
                    canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);
                    x += barWidth + 1;
                }
            };
            draw();
        } else if (visualSetting == "off") {
            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
            canvasCtx.fillStyle = "red";
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        }

    }

    function voiceChange() {
        distortion.curve = new Float32Array(analyser.fftSize);
        distortion.oversample = '4x';
        biquadFilter.gain.value = 0;
        convolver.buffer = undefined;
        var voiceSetting = voiceSelect.value;
        console.log(voiceSetting);
        if (voiceSetting == "distortion") {
            distortion.curve = makeDistortionCurve(400);
        } else if (voiceSetting == "convolver") {
            convolver.buffer = concertHallBuffer;
        } else if (voiceSetting == "biquad") {
            biquadFilter.type = "lowshelf";
            biquadFilter.frequency.value = 1000;
            biquadFilter.gain.value = 25;
        } else if (voiceSetting == "off") {
            console.log("Voice settings turned off");
        }
    }
    visualSelect.onchange = function () {
        window.cancelAnimationFrame(drawVisual);
        visualize();
    }
    voiceSelect.onchange = function () {
        voiceChange();
    }
    mute.onclick = voiceMute;

    function voiceMute() {
        if (mute.id == "") {
            gainNode.gain.value = 0;
            mute.id = "activated";
            mute.innerHTML = "Unmute";
        } else {
            gainNode.gain.value = 1;
            mute.id = "";
            mute.innerHTML = "Mute";
        }
    }
})