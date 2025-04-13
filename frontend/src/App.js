import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import UploadSection from './components/UploadSection';
import VideoPlayer from './components/VideoPlayer';
import Joyride from 'react-joyride';
import './App.css';

function MainApp() {
  const [csvFile, setCsvFile] = useState(null);
  const [end_frames, setEndFrames] = useState([]);
  const [runTour, setRunTour] = useState(true);
  const [tourSteps, setTourSteps] = useState([]);

  // Initial steps (before CSV is uploaded)
  const initialSteps = [
   
    {
      target: '#video-input',
      content: 'Start by uploading your raw video file here.',
    },
    {
      target: '#csv-upload',
      content: 'Now upload  a CSV file here which is of the following format [frame track_id class_id confidence x1 y1 x2 y2 ].',
    },
  ];

  // Steps shown after CSV is uploaded
  const postUploadSteps = [
    {
      target: '#input-a',
      content: 'Enter the old ID you want to replace (A).',
    },
    {
      target: '#input-b',
      content: 'Enter the new ID you want to assign (B).',
    },
    {
      target: '#add-correction',
      content: 'Click here to add the correction to the table.',
    },
    {
      target: '#apply-correction',
      content: 'Click here to apply all corrections and reprocess the video.',
    },
    {
      target: '.frame-navigation',
      content: 'Use these buttons to navigate to key frames (potential frames where ID Switches happen).',
    },
    {
      target: '.controls',
      content: 'Use these controls to play, pause, and track frame/ID info.',
    },
  ];

  // Set initial steps on mount
  useEffect(() => {
    setTourSteps(initialSteps);
  }, []);

  const handleCsvUploadSuccess = (file, endFrames) => {
    setCsvFile(file);
    setEndFrames(endFrames);

    // Update steps and restart tour
    setTourSteps(postUploadSteps);
    setRunTour(false);
    setTimeout(() => setRunTour(true), 0);
  };

  return (
    <div className="app">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        scrollToFirstStep
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#007bff', // Blue
          },
        }}
      />

      <div className="sidebar">
        <UploadSection
          csvFile={csvFile}
          onCsvUpload={handleCsvUploadSuccess}
        />
      </div>

      <div className="main">
        <VideoPlayer
          csvFile={csvFile}
          runTour={runTour}
          setRunTour={setRunTour}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
