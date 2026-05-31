import React, { useState } from 'react';

const MixtapeUpload = ({ onUpload }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !file) {
      setMessage('Please enter a title and select a file.');
      return;
    }
    // For now, just simulate upload
    setMessage('Uploading...');
    setTimeout(() => {
      setMessage('Upload complete!');
      onUpload({ title, file });
    }, 1000);
  };

  return (
    <form className="mixtape-upload-form" onSubmit={handleSubmit}>
      <h2>Upload Your Mixtape</h2>
      <input
        type="text"
        placeholder="Mixtape Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input type="file" accept="audio/*" onChange={handleFileChange} required />
      <button type="submit">Upload</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default MixtapeUpload;
