// import React, { useState } from 'react';
// import UploadSection from './components/UploadSection';
// import VideoPlayer from './components/VideoPlayer';
// import './App.css';

// function App() {
//   const [csvFile, setCsvFile] = useState(null);
//   const [end_frames, setEndFrames] = useState([]);
//   const handleCsvUploadSuccess = (file,end_frames) => {
//     setCsvFile(file); // Store the uploaded CSV file in the parent component
//     setEndFrames(end_frames);
//   };

//   return (
//     <div className="app">
//       <div className="sidebar">
//         <UploadSection csvFile={csvFile} onCsvUpload={handleCsvUploadSuccess} />
//       </div>
//       <div className="main">
//         <VideoPlayer csvFile={csvFile}/>
//       </div>
//     </div>
//   );
// }

// export default App;

// src/App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import UploadSection from './components/UploadSection';
import VideoPlayer from './components/VideoPlayer';
import './App.css';

function MainApp() {
  const [csvFile, setCsvFile] = useState(null);
  const [end_frames, setEndFrames] = useState([]);
  
  const handleCsvUploadSuccess = (file, end_frames) => {
    setCsvFile(file);
    setEndFrames(end_frames);
  };

  return (
    <div className="app">
      <div className="sidebar">
        <UploadSection csvFile={csvFile} onCsvUpload={handleCsvUploadSuccess} />
      </div>
      <div className="main">
        <VideoPlayer csvFile={csvFile}/>
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