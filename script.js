// Create an AudioContext for the Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Object to store playback data for each category
let sounds = {};

// Object to store whether a category is currently playing
let isPlaying = {};

// Object to store the current volume for each category
let volumeSettings = {
    'rain': 1,
    'thunder': 1,
    'ocean': 1,
    'forest': 1
    // Add more categories here if needed
};

// Arrays of sound files for each category
const soundFiles = {
    'rain': [
        'rain1.wav'
        // Add more rain sound files here
    ],
    'thunder': [
        'thunder1.wav',
        'thunder2.wav',
        'thunder3.wav'
        // Add more thunder sound files here
    ],
    'ocean': [
        'ocean1.wav'
        // Add more ocean sound files here
    ],
    'forest': [
        'forest1.wav',
        'forest2.wav'
        // Add more forest sound files here
    ]
    // Add more categories here if needed
};

// Function to toggle sound on and off for a category
function toggleSound(category) {
    if (isPlaying[category]) {
        // If the category is currently playing, stop it
        stopSound(category);
    } else {
        // If the category is not playing, start it
        playSound(category);
    }
}

// Function to play sound(s) for a category with overlapping transitions
function playSound(category) {
    isPlaying[category] = true;

    // Initialize playback data for the category
    sounds[category] = {
        // Start from a random index
        currentIndex: Math.floor(Math.random() * soundFiles[category].length),
        currentSource: null,
        nextSource: null,
        overlapTimeout: null,
        gainNode: audioContext.createGain(),
        fadeIntervals: []
    };

    // Set the initial volume
    sounds[category].gainNode.gain.value = volumeSettings[category];

    // Start playing the first audio file in the category
    playAudioWithOverlap(category);

    // Add 'active' class to the sound-item div
    let element = document.getElementById(`sound-item-${category}`);
    if (element) {
        element.classList.add('active');
    }
}

// Function to play an audio file with overlap
function playAudioWithOverlap(category) {
    if (!isPlaying[category]) {
        return; // Do not proceed if the category is not playing
    }

    let soundData = sounds[category];
    let soundList = soundFiles[category];
    let currentIndex = soundData.currentIndex;
    let filename = soundList[currentIndex];

    // Fetch and decode the audio file
    fetch(`sounds/${category}/${filename}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            // Create a buffer source
            let source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(soundData.gainNode).connect(audioContext.destination);

            // Set up overlap
            let duration = audioBuffer.duration;
            let overlapTime = 3; // seconds
            let timeToOverlap = duration - overlapTime;

            if (timeToOverlap < 0) {
                timeToOverlap = duration; // In case the audio is shorter than overlapTime
            }

            // Start playback
            source.start();

            soundData.currentSource = source;

            // Schedule the next audio to start with overlap
            soundData.overlapTimeout = setTimeout(function () {
                // Select a random index for the next sound
                soundData.currentIndex = Math.floor(Math.random() * soundList.length);
                // Start next audio
                playNextAudioWithOverlap(category);
            }, timeToOverlap * 1000); // Convert to milliseconds

            // When current audio ends, clean up
            source.onended = function () {
                soundData.currentSource = null;
                // Clear any fade intervals
                soundData.fadeIntervals.forEach(function (intervalId) {
                    clearInterval(intervalId);
                });
                soundData.fadeIntervals = [];
                // Start next audio immediately
                soundData.currentIndex = Math.floor(Math.random() * soundList.length);
                playAudioWithOverlap(category);
            };
        })
        .catch(error => {
            console.error(`Error playing sound ${filename}:`, error);
        });
}

// Function to play the next audio with overlap
function playNextAudioWithOverlap(category) {
    if (!isPlaying[category]) {
        return; // Do not proceed if the category is not playing
    }

    let soundData = sounds[category];
    let soundList = soundFiles[category];
    let currentIndex = soundData.currentIndex;
    let filename = soundList[currentIndex];

    // Fetch and decode the audio file
    fetch(`sounds/${category}/${filename}`)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            // Create a buffer source for the next audio
            let nextSource = audioContext.createBufferSource();
            let nextGainNode = audioContext.createGain();
            nextGainNode.gain.value = 0; // Start at 0 volume
            nextSource.buffer = audioBuffer;
            nextSource.connect(nextGainNode).connect(audioContext.destination);

            // Start playback
            nextSource.start();

            soundData.nextSource = nextSource;

            // Fade in next audio over 3 seconds
            let fadeDuration = 3; // seconds
            let fadeSteps = 30; // Number of steps in fade
            let fadeIntervalTime = (fadeDuration * 1000) / fadeSteps; // milliseconds
            let volumeStep = volumeSettings[category] / fadeSteps;
            let fadeCount = 0;

            let fadeInInterval = setInterval(function () {
                if (fadeCount >= fadeSteps) {
                    clearInterval(fadeInInterval);
                    nextGainNode.gain.value = volumeSettings[category];
                } else {
                    nextGainNode.gain.value += volumeStep;
                    fadeCount++;
                }
            }, fadeIntervalTime);

            soundData.fadeIntervals.push(fadeInInterval);

            // Fade out current audio over 3 seconds
            if (soundData.currentSource) {
                let currentSource = soundData.currentSource;
                let currentGainNode = soundData.gainNode;
                let fadeOutCount = 0;
                let volumeOutStep = currentGainNode.gain.value / fadeSteps;

                let fadeOutInterval = setInterval(function () {
                    if (fadeOutCount >= fadeSteps) {
                        clearInterval(fadeOutInterval);
                        currentSource.stop();
                    } else {
                        currentGainNode.gain.value -= volumeOutStep;
                        fadeOutCount++;
                    }
                }, fadeIntervalTime);

                soundData.fadeIntervals.push(fadeOutInterval);
            }

            // Set up for the next overlap
            let duration = audioBuffer.duration;
            let overlapTime = 3; // seconds
            let timeToOverlap = duration - overlapTime;

            if (timeToOverlap < 0) {
                timeToOverlap = duration; // In case the audio is shorter than overlapTime
            }

            soundData.overlapTimeout = setTimeout(function () {
                // Select a random index for the next sound
                soundData.currentIndex = Math.floor(Math.random() * soundList.length);
                // Start next audio
                playNextAudioWithOverlap(category);
            }, timeToOverlap * 1000);

            // When next audio ends, clean up
            nextSource.onended = function () {
                soundData.currentSource = null;
                soundData.nextSource = null;
                // Clear any fade intervals
                soundData.fadeIntervals.forEach(function (intervalId) {
                    clearInterval(intervalId);
                });
                soundData.fadeIntervals = [];
                // Start next audio immediately
                soundData.currentIndex = Math.floor(Math.random() * soundList.length);
                playAudioWithOverlap(category);
            };

            // Update references
            soundData.currentSource = nextSource;
            soundData.gainNode = nextGainNode;
            soundData.nextSource = null;
        })
        .catch(error => {
            console.error(`Error playing sound ${filename}:`, error);
        });
}

// Function to stop sound(s) for a category
function stopSound(category) {
    isPlaying[category] = false;

    let soundData = sounds[category];

    // Stop and remove all audio objects for the category
    if (soundData) {
        if (soundData.currentSource) {
            soundData.currentSource.stop();
        }
        if (soundData.nextSource) {
            soundData.nextSource.stop();
        }
        if (soundData.overlapTimeout) {
            clearTimeout(soundData.overlapTimeout);
        }
        // Clear any fade intervals
        if (soundData.fadeIntervals) {
            soundData.fadeIntervals.forEach(function (intervalId) {
                clearInterval(intervalId);
            });
        }
        // Reset soundData
        sounds[category] = null;
    }

    // Remove 'active' class from the sound-item div
    let element = document.getElementById(`sound-item-${category}`);
    if (element) {
        element.classList.remove('active');
    }
}

// Function to change volume for a category
function changeVolume(category, volume) {
    volume = parseFloat(volume); // Convert volume to a number
    volumeSettings[category] = volume;

    // If the category is playing, update the gain node's volume
    let soundData = sounds[category];
    if (isPlaying[category] && soundData) {
        if (soundData.gainNode) {
            soundData.gainNode.gain.value = volume;
        }
    }
}

// Dark Mode Toggle Function
function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById('dark-mode-icon');

    body.classList.toggle('dark-mode');

    // Change the icon to represent the current mode
    if (body.classList.contains('dark-mode')) {
        icon.src = 'icons/darkmode.png'; // Icon representing dark mode
        icon.alt = 'Dark Mode';
        // Save preference in localStorage
        localStorage.setItem('darkMode', 'enabled');
    } else {
        icon.src = 'icons/lightmode.png'; // Icon representing light mode
        icon.alt = 'Light Mode';
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Enable dark mode by default
window.onload = function () {
    // Check if user has a preference saved
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'disabled') {
        // Remove dark mode
        document.body.classList.remove('dark-mode');
        const icon = document.getElementById('dark-mode-icon');
        icon.src = 'icons/lightmode.png';
        icon.alt = 'Light Mode';
    } else {
        // Ensure dark mode is enabled
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('dark-mode-icon');
        icon.src = 'icons/darkmode.png';
        icon.alt = 'Dark Mode';
    }
};
