// import React, { useState, useRef } from 'react';
// import Footer from '../components/footer'
// import Header from '../components/header'
// import WeatherCharts from '../components/WeatherCharts';

// const WeatherPage = () => {

//     const [weatherCity, setWeatherCity] = useState('26.4187,-81.4173');
//     const [weatherStartDate, setWeatherStartDate] = useState('');
//     const [weatherEndDate, setWeatherEndDate] = useState('');
//     const [temperatureUnit, setTemperatureUnit] = useState('C');
//     const precipChartRef = useRef(null);
//     const tempChartRef = useRef(null);
//     const ensembleChartRef = useRef(null);


 
//   return (
//     <div>
//         <Header/>
//         <div className="container">
//         <h1>Weather Dashboard</h1>
//         <WeatherCharts
//           city={weatherCity}
//           setCity={setWeatherCity}
//           startDate={weatherStartDate}
//           setStartDate={setWeatherStartDate}
//           endDate={weatherEndDate}
//           setEndDate={setWeatherEndDate}
//           unit={temperatureUnit}
//           setUnit={setTemperatureUnit}
//           precipChartRef={precipChartRef}
//           tempChartRef={tempChartRef}
//           ensembleChartRef={ensembleChartRef}
//         />
//       </div>
//         <Footer/>
//     </div>
//   )
// }



// export default WeatherPage;


import React, { useState, useRef } from "react";
import Footer from "../components/footer";
import Header from "../components/header";
import "../styles/weather_styles.css";

const WeatherPage = () => {
  const [weatherCity, setWeatherCity] = useState("26.4187,-81.4173");
  const [weatherStartDate, setWeatherStartDate] = useState("");
  const [weatherEndDate, setWeatherEndDate] = useState("");
  const [temperatureUnit, setTemperatureUnit] = useState("C");
  const [activeTab, setActiveTab] = useState("Precipitation"); // State for active tab

  const precipChartRef = useRef(null);
  const tempChartRef = useRef(null);
  const ensembleChartRef = useRef(null);

  // Function to render active chart
  const renderActiveChart = () => {
    switch (activeTab) {
      case "Precipitation":
        return (
          <canvas
            ref={precipChartRef}
            width="200"
            height="150"
            className="weather-chart"
          ></canvas>
        );
      case "Temperature":
        return (
          <canvas
            ref={tempChartRef}
            width="200"
            height="150"
            className="weather-chart"
          ></canvas>
        );
      case "Ensemble Analysis":
        return (
          <canvas
            ref={ensembleChartRef}
            width="400"
            height="300"
            className="weather-chart"
          ></canvas>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Header />
      <div className="weather-dashboard">
        {/* Sidebar */}
        <div className="weather-sidebar">
          <h3>Select a Chart</h3>
          <ul>
            <li
              className={
                activeTab === "Precipitation" ? "weather-sidebar-active" : ""
              }
              onClick={() => setActiveTab("Precipitation")}
            >
              Precipitation
            </li>
            <li
              className={
                activeTab === "Temperature" ? "weather-sidebar-active" : ""
              }
              onClick={() => setActiveTab("Temperature")}
            >
              Temperature
            </li>
            <li
              className={
                activeTab === "Ensemble Analysis" ? "weather-sidebar-active" : ""
              }
              onClick={() => setActiveTab("Ensemble Analysis")}
            >
              Ensemble Analysis
            </li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="weather-main-content">
          <div className="weather-inputs">
            <input
              type="date"
              value={weatherStartDate}
              onChange={(e) => setWeatherStartDate(e.target.value)}
              className="weather-input"
            />
            <input
              type="date"
              value={weatherEndDate}
              onChange={(e) => setWeatherEndDate(e.target.value)}
              className="weather-input"
            />
            <select
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              className="weather-select"
            >
              <option value="26.4187,-81.4173">Immokalee, FL</option>
              <option value="26.7153,-80.0534">Palm Beach County, FL</option>
              <option value="39.4802,-75.0138">Vineland, NJ</option>
              <option value="42.0086,-86.3614">Sodus, MI</option>
              <option value="25.1721,-107.4795">Sinaloa, Mexico</option>
              <option value="29.2972,-110.3309">Sonora, Mexico</option>
            </select>
            <select
              value={temperatureUnit}
              onChange={(e) => setTemperatureUnit(e.target.value)}
              className="weather-select"
            >
              <option value="C">Celsius (°C)</option>
              <option value="F">Fahrenheit (°F)</option>
            </select>
          </div>

          {/* Render Active Chart */}
          <div className="weather-chart-container">{renderActiveChart()}</div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default WeatherPage;
