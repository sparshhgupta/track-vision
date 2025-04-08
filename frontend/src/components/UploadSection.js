import React, { useState, useEffect } from "react";
import axios from 'axios';

// frame_numbers = [30, 40, 50];
let exportedFrameNumbers = [];


function UploadSection({ csvFile, onCsvUpload }) {
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [frameNumber, setFrameNumber] = useState("");
  const [A, setA] = useState("");
  const [B, setB] = useState("");

  useEffect(() => {
    setCsvUploaded(!!csvFile);
  }, [csvFile]);

  const fetchFrameNumbers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/get-frame-numbers');
      if (response.data?.end_frames) {
        exportedFrameNumbers = response.data.end_frames; // Update exported variable
        alert(`Received frames: ${exportedFrameNumbers.join(', ')}`);
      }
    } catch (error) {
      console.error('Error fetching frames:', error);
    }
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      alert('Please upload a valid CSV file.');
      return;
    }

    const formData = new FormData();
    formData.append('csv', file);

    try {
      const response = await axios.post('http://127.0.0.1:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });

      if (response.status === 200) {
        const contentDisposition = response.headers['content-disposition'];
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
          : 'processed_video.mp4';

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
          videoPlayer.src = url;
          videoPlayer.load();
        }

        alert('CSV file processed successfully. Video updated.');
        await fetchFrameNumbers();
        onCsvUpload(file, exportedFrameNumbers);
        setCsvUploaded(true);
      } else {
        throw new Error('Server returned non-200 status');
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      
      let errorMessage = 'Error uploading CSV file';
      if (error.response) {
        // Try to get error message from response
        if (error.response.data instanceof Blob) {
          // If the error response is a Blob, try to read it as text
          const text = await error.response.data.text();
          errorMessage = text || errorMessage;
        } else {
          errorMessage = error.response.data.message || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      alert(errorMessage);
    }
  };

  const handleLogChanges = () => {
    if (!frameNumber.trim() || !A.trim() || !B.trim()) {
      alert("Please enter all values before logging.");
      return;
    }
    
    setLogEntries([...logEntries, { frameNumber, A, B }]);
    setFrameNumber("");
    setA("");
    setB("");
  };

  const handleClearTable = async () => {
    if (logEntries.length === 0) {
      alert("No data to send.");
      return;
    }
    
    try {
      const response = await fetch("http://localhost:5000/save-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logs: logEntries }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const newVideoUrl = `http://127.0.0.1:5000/temp/${data.new_video}`;
        const videoPlayer = document.querySelector('video');
        if (videoPlayer) {
          videoPlayer.src = newVideoUrl;
          videoPlayer.load(); // Important to reload the video
        }
        alert("Logs successfully saved to backend.");
        setLogEntries([]);
      } else {
        alert(data.message || "Failed to update ID and reprocess video.");
      }
    } catch (error) {
      console.error("Error updating ID:", error);
      alert(error.message || "Error updating ID.");
    }
  };

  return (
    <div className="upload-section">
      {!csvUploaded ? (
        <>
          <label htmlFor="csv-upload" className="upload-btn">Upload CSV</label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCsvUpload}
          />
        </>
      ) : (
        <div className="log-section">
          <h3>Log Table</h3>
          <input
            type="text"
            placeholder="Frame Number"
            value={frameNumber}
            onChange={(e) => setFrameNumber(e.target.value)}
          />
          <input
            type="text"
            placeholder="A"
            value={A}
            onChange={(e) => setA(e.target.value)}
          />
          <input
            type="text"
            placeholder="B"
            value={B}
            onChange={(e) => setB(e.target.value)}
          />
          <button onClick={handleLogChanges}>Register Changes</button>
          <button onClick={handleClearTable}>Make Changes</button>

          {logEntries.length > 0 && (
            <table className="log-table">
              <thead>
                <tr>
                  <th>Frame Number</th>
                  <th>A</th>
                  <th>B</th>
                </tr>
              </thead>
              <tbody>
                {logEntries.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.frameNumber}</td>
                    <td>{entry.A}</td>
                    <td>{entry.B}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// export { exportedFrameNumbers };
export default UploadSection;