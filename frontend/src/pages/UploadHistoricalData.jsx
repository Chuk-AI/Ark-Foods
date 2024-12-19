import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS directly
import '../styles/styles.css'

function UploadHistoricalData() {
  const [commodity, setCommodity] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);

  const handleCommodityChange = (e) => {
    setCommodity(e.target.value);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commodity || !file) {
      setMessage({ type: 'error', text: 'Please select a commodity and upload a file.' });
      return;
    }

    const formData = new FormData();
    formData.append('commodity', commodity);
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload_historical', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'An error occurred during upload.',
      });
    }
  };

  return (

    
    <div className="container mt-5">
      <h1 className="text-center">Upload Historical Data</h1>
      <hr />

      {/* Flash Messages */}
      {message && (
        <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`} role="alert">
          <strong>{message.text}</strong>
        </div>
      )}

      {/* Upload Form */}
      <br />
      <form onSubmit={handleSubmit}>
        <div className="form-group ">
        {/* <br/> */}

          <label htmlFor="commodity">Select Commodity</label>
          <select
            className="form-control"
            id="commodity"
            name="commodity"
            value={commodity}
            onChange={handleCommodityChange}
            required
          >
            <option value="">-- Select a Commodity --</option>
            <option value="Anaheim">Anaheim</option>
            <option value="Cubanelle">Cubanelle</option>
            <option value="Fresno">Fresno</option>
            <option value="Habanero">Habanero</option>
            <option value="Hungarian Wax">Hungarian Wax</option>
            <option value="Jalapeno">Jalapeno</option>
            <option value="Long Hot">Long Hot</option>
            <option value="Poblano">Poblano</option>
            <option value="Serrano">Serrano</option>
            <option value="Shishito">Shishito</option>
          </select>
        </div>
        <br/>
        <div className="form-group">
  <label htmlFor="file" className="mb-2">Upload CSV File</label> {/* Add bottom margin */}
  <input
    type="file"
    className="form-control-file mb-2" /* Add bottom margin */
    id="file"
    name="file"
    onChange={handleFileChange}
    required
  />
  <small className="form-text text-muted mt-1">
    The CSV file should have the following columns: CityName, Year, Day, Price
  </small>
</div>

        <button type="submit" className="btn btn-primary mt-3">Upload</button>

      </form>
      
    </div>
  );
}

export default UploadHistoricalData;
