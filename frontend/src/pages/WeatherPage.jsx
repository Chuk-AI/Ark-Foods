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


 
  return (
    <div>
        <Header/>
        <div className="container">
        <h1>Weather Dashboard</h1>
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
          ensembleChartRef={ensembleChartRef}
        />
      </div>
        <Footer/>
    </div>
  )
}



export default WeatherPage;
