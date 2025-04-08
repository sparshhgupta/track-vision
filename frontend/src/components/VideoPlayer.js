import React, { useRef, useState, useEffect } from 'react';
import './VideoPlayer.css';
import axios from "axios";

function VideoPlayer({ csvFile }) {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showIdPopup, setShowIdPopup] = useState(false);
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [newId, setNewId] = useState("");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameData, setFrameData] = useState({
    frames: [],
    trackIds: []
  });
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const [frameRate, setFrameRate] = useState(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1);

  useEffect(() => {
    setCsvUploaded(!!csvFile);
    if (csvFile) {
      fetchFrameNumbers();
    }
  }, [csvFile]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      setFrameRate(video.webkitDecodedFrameCount / video.duration || 30);
    }
  };

  const fetchFrameNumbers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/get-frame-numbers');
      if (response.data.end_frames && response.data.track_ids) {
        setFrameData({
          frames: response.data.end_frames,
          trackIds: response.data.track_ids
        });
        console.log("Fetched frame data:", response.data);
      }
    } catch (error) {
      console.error("Error fetching frame numbers:", error);
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const formData = new FormData();
      formData.append('video', file);

      try {
        const response = await axios.post('http://127.0.0.1:5000/upload-video', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        if (response.data.success) {
          setVideoSrc(URL.createObjectURL(file));
          alert('Video uploaded successfully.');
        } else {
          alert('Error uploading video.');
        }
      } catch (error) {
        console.error('Video upload error:', error);
        alert('Error uploading video.');
      }
    } else {
      alert('Please upload a valid video file.');
    }
  };
  
  const handleEditId = () => {
    setShowIdPopup(true);
    if (videoRef.current) videoRef.current.pause();
    cancelAnimationFrame(animationRef.current);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        cancelAnimationFrame(animationRef.current);
      } else {
        videoRef.current.play();
        requestFrameUpdate();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (event) => {
    const newProgress = event.target.value;
    setProgress(newProgress);
    if (videoRef.current) {
      videoRef.current.currentTime = (videoRef.current.duration * newProgress) / 100;
    }
    updateCurrentFrameIndex(videoRef.current.currentTime * frameRate);
  };

  const requestFrameUpdate = () => {
    if (videoRef.current && !videoRef.current.paused) {
      const frame = Math.floor(videoRef.current.currentTime * frameRate);
      setCurrentFrame(frame);
      updateCurrentFrameIndex(frame);
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      animationRef.current = requestAnimationFrame(requestFrameUpdate);
    }
  };

  const handleSaveId = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/update-id', {
        currentFrame: currentFrame,
        currentId: currentId,
        newId: newId,
      });
  
      if (response.data.success) {
        const newVideoUrl = `http://127.0.0.1:5000/temp/${response.data.new_video}`;
        setVideoSrc(newVideoUrl); // Update the video source
        alert("ID updated successfully and video reprocessed.");
      } else {
        alert("Failed to update ID and reprocess video.");
      }
    } catch (error) {
      console.error("Error updating ID:", error);
      alert("Error updating ID.");
    }
  
    setShowIdPopup(false);
    setCurrentId("");
    setNewId("");
    setIsPlaying(false);
  };

  const updateCurrentFrameIndex = (frame) => {
    const index = frameData.frames.findIndex(f => f === frame);
    setCurrentFrameIndex(index);
    if (index >= 0) {
      setCurrentTrackId(frameData.trackIds[index]);
    } else {
      setCurrentTrackId(null);
    }
  };

  const navigateToFrame = (frame, index) => {
    if (videoRef.current) {
      const time = frame / frameRate;
      videoRef.current.currentTime = time;
      setCurrentFrame(frame);
      setProgress((time / videoRef.current.duration) * 100);
      updateCurrentFrameIndex(frame);
    }
  };

  const navigatePrev = () => {
    if (currentFrameIndex > 0) {
      navigateToFrame(frameData.frames[currentFrameIndex - 1]);
    } else if (currentFrameIndex === -1 && frameData.frames.length > 0) {
      navigateToFrame(frameData.frames[0]);
    } else {
      navigateToFrame(0);
    }
  };

  const navigateNext = () => {
    if (currentFrameIndex < frameData.frames.length - 1) {
      navigateToFrame(frameData.frames[currentFrameIndex + 1]);
    } else if (currentFrameIndex === -1 && frameData.frames.length > 0) {
      navigateToFrame(frameData.frames[0]);
    } else {
      if (videoRef.current) {
        navigateToFrame(Math.floor(videoRef.current.duration * frameRate));
      }
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <div className="video-player">
      {!videoSrc && (
        <>
          <label htmlFor="video-upload" className="upload-btn">Upload Video</label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleVideoUpload}
          />
        </>
      )}

      {videoSrc && (
        <div style={{ position: 'relative', width: '100%' }}>
          <video
            ref={videoRef}
            className="video-element"
            src={videoSrc}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          {/* <video
            ref={videoRef}
            className="video-element"
            src={videoSrc}
            onEnded={() => setIsPlaying(false)}
            style={{ filter: showIdPopup ? 'brightness(0.8)' : 'none' }}
          /> */}
          {showIdPopup && <div className="dimming-overlay" />}
        </div>
      )}

{videoSrc && (
        <div className="controls">
          <button onClick={togglePlayPause}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSliderChange}
          />
          <div className="frame-info">
            <span>Frame: {currentFrame}</span>
            {currentTrackId !== null && (
              <span className="track-id">| Track ID: {currentTrackId}</span>
            )}
          </div>
        </div>
      )}

      {videoSrc && (
        <div className="frame-navigation">
          <button onClick={navigatePrev}>Previous Frame</button>
          <button onClick={navigateNext}>Next Frame</button>
        </div>
      )}

      <div className="save-download">
        <button
          onClick={() => {
            if (csvUploaded) {
              handleEditId();
            } else {
              alert("Please upload a CSV file first to enable editing.");
            }
          }}
          disabled={!csvUploaded}
        >
          Edit ID
        </button>
      </div>

      {showIdPopup && (
        <div className="id-popup">
          <h3>Update ID</h3>
          <input
            type="text"
            placeholder="Current ID"
            value={currentId}
            onChange={(e) => setCurrentId(e.target.value)}
          />
          <input
            type="text"
            placeholder="New ID"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
          <button onClick={handleSaveId}>Save ID</button>
          <button onClick={() => { setShowIdPopup(false); }}>Close</button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;