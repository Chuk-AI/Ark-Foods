import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import moment from "moment";
import '../styles/weather_styles.css';


const WeatherCharts = () => {
  const precipChartRef = useRef(null);
  const tempChartRef = useRef(null);
  const ensembleChartRef = useRef(null);

  const [city, setCity] = useState("26.4187,-81.4173");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [unit, setUnit] = useState("C");

  useEffect(() => {
    if (city) {
      console.log("City changed:", city);
      fetchData();
    }
  }, [city, startDate, endDate, unit]);

  useEffect(() => {
    return () => {
        if (precipChartRef.current?.chartInstance) {
            precipChartRef.current.chartInstance.destroy();
        }
        if (tempChartRef.current?.chartInstance) {
            tempChartRef.current.chartInstance.destroy();
        }
        if (ensembleChartRef.current?.chartInstance) {
            ensembleChartRef.current.chartInstance.destroy();
        }
    };
}, []);


  const formatClimatologyData = (climatology, forecastDates) => {
    const formattedData = { TAVG: [], PRECIP: [] };

    forecastDates.forEach((date) => {
      const dayKey = date.slice(5); // Extract %m-%d from %Y-%m-%d
      formattedData.TAVG.push(climatology.TAVG[dayKey] || null);
      formattedData.PRECIP.push(climatology.PRECIP[dayKey] || null);
    });

    return formattedData;
  };

  const fetchData = async () => {
    try {
      const response = await fetch(
        `/api/weather_forecasts?lat=${city.split(",")[0]}&lon=${city.split(",")[1]}&start=${startDate}&end=${endDate}`
      );
      console.log("API URL:", `/api/weather_forecasts?lat=${city.split(",")[0]}&lon=${city.split(",")[1]}&start=${startDate}&end=${endDate}`);

      const data = await response.json();
      console.log("API Response Data:", data);
  
      if (data.error) {
        console.error("API Error:", data.error);
        return;
      }

     // Clear previous charts
        if (precipChartRef.current?.chartInstance) precipChartRef.current.chartInstance.destroy();
        if (tempChartRef.current?.chartInstance) tempChartRef.current.chartInstance.destroy();
        if (ensembleChartRef.current?.chartInstance) ensembleChartRef.current.chartInstance.destroy();

        // Process and render new data
        const convertedData = convertTemperatureData(data, unit);
        const formattedClimatology = formatClimatologyData(
            convertedData.daily_climatology,
            convertedData.forecast_data.TAVG.dates
        );

        renderCharts({
            ...convertedData,
            daily_climatology: formattedClimatology,
        });
    } catch (error) {
        console.error("Error fetching weather data:", error);
    }
};

  const convertTemperatureData = (data, unit) => {
    if (!data.forecast_data || !data.daily_climatology) {
      console.error("Temperature data missing from response:", data);
      return data;
    }

    const convert = (value) => {
      if (unit === "C") return value - 273.15;
      if (unit === "F") return ((value - 273.15) * 9) / 5 + 32;
      return value;
    };

    if (data.forecast_data.TAVG) {
      data.forecast_data.TAVG.avg = data.forecast_data.TAVG.avg.map(convert);
      data.forecast_data.TAVG.min = data.forecast_data.TAVG.min.map(convert);
      data.forecast_data.TAVG.max = data.forecast_data.TAVG.max.map(convert);
    }

    if (data.daily_climatology.TAVG) {
      data.daily_climatology.TAVG = Object.fromEntries(
        Object.entries(data.daily_climatology.TAVG).map(([key, value]) => [key, convert(value)])
      );
    }

    return data;
  };
  const renderCharts = (data) => {
    console.log("Data passed to renderCharts:", data);

    // Render Precipitation Chart if data is available
    if (data.forecast_data.PRECIP && data.forecast_data.PRECIP.dates?.length) {
      createLineChart(
        precipChartRef,
        data.forecast_data.PRECIP.dates,
        {
          "Forecast (Avg)": data.forecast_data.PRECIP.avg,
          Climatology: data.daily_climatology.PRECIP,
          Min: data.forecast_data.PRECIP.min,
          Max: data.forecast_data.PRECIP.max,
        },
        "Precipitation (mm)",
        ["blue", "red", "lightblue", "lightblue"]
      );
    } else {
      console.error("Missing precipitation data.");
    }

    // Render Temperature Chart if data is available
    if (data.forecast_data.TAVG && data.forecast_data.TAVG.dates?.length) {
      const tempLabel = unit === "C" ? "Temperature (°C)" : "Temperature (°F)";
      createLineChart(
        tempChartRef,
        data.forecast_data.TAVG.dates,
        {
          "Forecast (Avg)": data.forecast_data.TAVG.avg,
          Climatology: data.daily_climatology.TAVG,
          Min: data.forecast_data.TAVG.min,
          Max: data.forecast_data.TAVG.max,
        },
        tempLabel,
        ["blue", "red", "lightblue", "lightblue"]
      );
    } else {
      console.error("Missing temperature data.");
    }

    // Render Ensemble Analysis Chart if data is available
    const sortedEnsembleTotals = data.accumulation_data?.ensemble_totals || [];
    const climatologyValue = data.accumulation_data?.accumulated_climo_precip || 0;

    if (sortedEnsembleTotals.length) {
      createBarChart(ensembleChartRef, sortedEnsembleTotals, climatologyValue);
    } else {
      console.error("No ensemble totals available.");
    }
  };

  const createLineChart = (ref, labels, datasets, label, colors) => {
    if (ref.current.chartInstance) {
      ref.current.chartInstance.destroy();
    }

    const ctx = ref.current.getContext("2d");

    const datasetArray = Object.keys(datasets).map((key, index) => ({
      label: key,
      data: datasets[key] || [],
      borderColor: colors[index],
      fill: false,
      pointRadius: 0, // Remove points on the line
    }));

    ref.current.chartInstance = new Chart(ctx, {
      type: "line",
      data: { labels, datasets: datasetArray },
      options: {
        scales: {
          x: { type: "time", time: { unit: "day" },
          ticks: {
            color: "white", // Set tick labels color to white
            font: { size: 12 }, // Adjust font size if needed
          }, },
          
          y: { title: { display: true, text: label,  color: "white", // Set the title color to white
          font: { size: 14, weight: "bold" }, },
          ticks: {
            color: "white", // Set tick labels color to white
            font: { size: 12 }, // Adjust font size if needed
          },
        },
        },
        plugins: {
          legend: { display: true, position: "top" },
          datalabels: { display: false }, // Disable datalabels globally
        },
      },
    });
  };

  const createBarChart = (ref, totals, climatologyValue) => {
    if (ref.current.chartInstance) {
      ref.current.chartInstance.destroy();
    }
  
    // Sort totals in descending order and adjust labels accordingly
    const sortedData = totals
      .map((value, index) => ({ label: `Ensemble ${index + 1}`, value })) // Combine labels and data
      .sort((a, b) => b.value - a.value); // Sort by value in descending order
  
    const sortedLabels = sortedData.map(item => item.label); // Extract sorted labels
    const sortedTotals = sortedData.map(item => item.value); // Extract sorted values
  
    const ctx = ref.current.getContext("2d");
  
    ref.current.chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedLabels, // Use sorted labels
        datasets: [
          {
            label: "Ensemble Totals",
            data: sortedTotals, // Use sorted data
            backgroundColor: "white",
          },
          {
            label: "Climatology",
            data: Array(sortedTotals.length).fill(climatologyValue),
            type: "line",
            borderColor: "white",
            borderWidth: 2,
            pointRadius: 0, // Remove points on the line
          },
        ],
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: () => `Probability: Calculated dynamically.`,
            },
          },
          datalabels: { display: false }, // Disable datalabels globally
        },
        scales: {
          x: { title: { display: true, text: "Ensemble Members", color: "white", // Set the title color to white
          font: { size: 14, weight: "bold" }, },
          
          ticks: {
            color: "white", // Set tick labels color to white
            font: { size: 12 }, // Adjust font size if needed
          }, },
          y: { title: { display: true, text: "Accumulated Precipitation (mm)",color: "white", // Set the title color to white
          font: { size: 14, weight: "bold" }, },
          ticks: {
            color: "white", // Set tick labels color to white
            font: { size: 12 }, // Adjust font size if needed
          }, },
        },
      },
    });
  };
  
  
  return (
    <div className="weather-layout">
      <div className="weather-inputs">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ margin: "20px", border:'1px solid #33b2a8', padding:'7px', borderRadius:'10px' }}/>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}   style={{ margin: "20px", border:'1px solid #33b2a8', padding:'7px', borderRadius:'10px' }} />
        <select value={city} onChange={(e) => setCity(e.target.value)}  style={{ margin: "20px", border:'1px solid #33b2a8', padding:'7px', borderRadius:'10px' }}>
        <option value="26.4187,-81.4173">Immokalee, FL</option>
      <option value="26.7153,-80.0534">Palm Beach County, FL</option>
      <option value="39.4802,-75.0138">Vineland, NJ</option>
      <option value="42.0086,-86.3614">Sodus, MI</option>
      <option value="25.1721,-107.4795">Sinaloa, Mexico</option>
      <option value="29.2972,-110.3309">Sonora, Mexico</option>
      <option value="31.86613056,-116.59971944">Ensenada, Mexico</option>
      <option value="28.0444,-115.2062">Baja, Mexico</option>
      <option value="24.8091,-107.3940">Culican, Mexico</option>
      <option value="35.3187,-82.4610">Hendersonville, NC</option>
      <option value="33.5568,-80.7151">Cameron, SC</option>
      <option value="31.13633333,-83.42216389">Adel, GA</option>
      <option value="30.6844,-83.1849">Lake Park, GA</option>
      <option value="27.6386,-81.8265">Bowling Green, FL</option>
        </select>
        <select value={unit} onChange={(e) => setUnit(e.target.value)}    style={{ margin: "20px", border:'1px solid #33b2a8', padding:'7px', borderRadius:'10px' }}>
          
          <option value="C">Celsius (°C)</option>
          <option value="F">Fahrenheit (°F)</option>
        </select>
      </div>

      <div className="chart-container">
  <div className="row-charts">

    <canvas ref={precipChartRef} width="200" height="150" style={{  border:' 1px solid #33b1a7', borderRadius:'20px'}}></canvas>


    <canvas ref={tempChartRef} width="200" height="150" style={{  border:' 1px solid #33b1a7', borderRadius:'20px'}}></canvas>

  </div>
  <div className="third-chart">
  <canvas ref={ensembleChartRef} width="100" height="100"></canvas>
  </div>

</div>
    </div>
  );
};

export default WeatherCharts

