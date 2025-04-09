

import React, { useState } from 'react';
import Header from '../components/header';
import ForecastLineChart from '../components/ForecastLineChart';
import BreakEvenEstimator from '../components/BreakEvenEstimator';
import '../styles/dynamic.css'; // Make sure to import the CSS file

export default function DynamicAnalytics() {
  // State to track which chart is currently selected
  const [activeChart, setActiveChart] = useState(null);

  // Available chart options
  const chartOptions = [
    { 
      id: 'forecastLine', 
      name: 'Price Forecast Trends', 
      icon: 'fa-chart-line',
      description: 'View forecasted price trends based on seasonal patterns'
    },
    { 
      id: 'breakEven', 
      name: 'Break Even Estimator', 
      icon: 'fa-calculator',
      description: 'Analyze profitability and market price comparisons'
    }
  ];

  // Function to render the selected chart
  const renderChart = () => {
    switch (activeChart) {
      case 'forecastLine':
        return <ForecastLineChart />;
      case 'breakEven':
        return <BreakEvenEstimator />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header />
      
      <div className="container-fluid mt-5 pt-4">
        {/* Analytics Header */}
        <div className="analytics-header" style={{textAlign:'center'}}>
          <h1>Dynamic Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            Explore market data through interactive visualizations and forecasting tools
          </p>
        </div>
        
        {!activeChart ? (
          <>
            {/* Chart Selection Cards */}
            <div className="row mb-4">
              {chartOptions.map(chart => (
                <div key={chart.id} className="col-md-4 mb-4">
                  <div 
                    className="chart-option-card p-4 text-center h-100"
                    onClick={() => setActiveChart(chart.id)}
                  >
                    <div className="chart-icon">
                      <i className={`fas ${chart.icon}`}></i>
                    </div>
                    <h3>{chart.name}</h3>
                    <p className="text-muted">{chart.description}</p>
                    <button className="btn btn-outline-primary mt-2">
                      View Chart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Chart Display with Back Option */}
            <div className="chart-toolbar d-flex justify-content-between align-items-center">
              <button 
                className="btn btn-outline-secondary"
                onClick={() => setActiveChart(null)}
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Chart Selection
              </button>
              <h2 className="mb-0">{chartOptions.find(c => c.id === activeChart)?.name}</h2>
              <div className="chart-actions">
                <button className="btn btn-outline-primary">
                  <i className="fas fa-question-circle mr-2"></i>
                  Help
                </button>
              </div>
            </div>
            
            {/* Render the active chart */}
            <div className="active-chart-container">
              {renderChart()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}