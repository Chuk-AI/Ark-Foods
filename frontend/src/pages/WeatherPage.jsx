import React, { useState, useRef } from 'react';
import Footer from '../components/footer'
import Header from '../components/header'
import WeatherCharts from '../components/WeatherCharts';

const WeatherPage = () => {

    const [weatherCity, setWeatherCity] = useState('26.4187,-81.4173');
    const [weatherStartDate, setWeatherStartDate] = useState('');
    const [weatherEndDate, setWeatherEndDate] = useState('');
    const [temperatureUnit, setTemperatureUnit] = useState('C');
    const precipChartRef = useRef(null);
    const tempChartRef = useRef(null);
    const ensembleChartRef = useRef(null);
    const [alphabet, setAlphabet] = useState("A")




  return (
    <div>
        <Header/>
        <div className="weather-container">
        {/* <h2>Weather Dashboard</h2> */}
        <WeatherCharts
          city={weatherCity}
          setCity={setWeatherCity}
          startDate={weatherStartDate}
          setStartDate={setWeatherStartDate}
          endDate={weatherEndDate}
          setEndDate={setWeatherEndDate}
          unit={temperatureUnit}
          setUnit={setTemperatureUnit}
          precipChartRef={precipChartRef}
          tempChartRef={tempChartRef}
        />
      </div>


        <Footer/>
    </div>
  )
}



export default WeatherPage;


