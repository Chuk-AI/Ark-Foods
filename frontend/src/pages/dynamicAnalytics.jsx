import React, { useState } from 'react';
import Header from '../components/header';
import ForecastLineChart from '../components/ForecastLineChart';
import BreakEvenEstimator from '../components/BreakEvenEstimator';
import HarvestPlanner from '../components/HarvestPlanner';
import VolatilityChart from '../components/VolatilityChart';
import '../styles/dynamic.css';
import { 
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
  Calculate as CalculateIcon,
  Spa as SpaIcon
} from '@mui/icons-material';

export default function DynamicAnalytics() {
  // State to track which chart is currently selected
  const [activeChart, setActiveChart] = useState(null);

  // Available chart options
  const chartOptions = [
    { 
      id: 'forecastLine', 
      name: 'Price Forecast Trends', 
      icon: 'fa-chart-line',
      color: '#1976d2',
      bgColor: '#e3f2fd',
      description: 'View forecasted price trends based on seasonal patterns'
    },
    { 
      id: 'volatility', 
      name: 'Market Volatility', 
      icon: 'fa-chart-bar',  // Changed to bar chart for visibility
      color: '#9c27b0', 
      bgColor: '#f3e5f5',
      description: 'Analyze price fluctuations to identify stable vs. risky market periods'
    },
    { 
      id: 'breakEven', 
      name: 'Break Even Estimator', 
      icon: 'fa-calculator',
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      description: 'Analyze profitability and market price comparisons'
    },
    { 
      id: 'harvestPlanner', 
      name: 'Harvest Planner', 
      icon: 'fa-seedling',
      color: '#e65100',
      bgColor: '#fff3e0',
      description: 'Optimize your planting and harvesting strategy with data-driven insights'
    }
  ];

  // Function to render the selected chart
  const renderChart = () => {
    switch (activeChart) {
      case 'forecastLine':
        return <ForecastLineChart />;
      case 'volatility':
        return <VolatilityChart />;
      case 'breakEven':
        return <BreakEvenEstimator />;
      case 'harvestPlanner':
        return <HarvestPlanner />;
      default:
        return null;
    }
  };

  const renderCardIcon = (chart) => {
    // Use Material UI icons instead
    let icon;
    switch(chart.id) {
      case 'forecastLine':
        icon = <ShowChartIcon style={{ fontSize: '32px', color: chart.color }} />;
        break;
      case 'volatility':
        icon = <BarChartIcon style={{ fontSize: '32px', color: chart.color }} />;
        break;
      case 'breakEven':
        icon = <CalculateIcon style={{ fontSize: '32px', color: chart.color }} />;
        break;
      case 'harvestPlanner':
        icon = <SpaIcon style={{ fontSize: '32px', color: chart.color }} />;
        break;
      default:
        icon = null;
    }
    
    return (
      <div style={{ 
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: chart.bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
    );
  };
  // Render the icon for each card
 

  return (
    <div>
      <Header />
      
      <div className="container-fluid mt-5 pt-4">
    
        
        {!activeChart ? (
          <>
            {/* Chart Selection Cards */}
            <div className="row">
              {chartOptions.map((chart, index) => (
                <div key={chart.id} className={`col-md-4 mb-4 ${index === 3 ? 'col-md-6 offset-md-3' : ''}`}>
                  <div 
                    className="chart-option-card"
                    onClick={() => setActiveChart(chart.id)}
                    style={{ 
                      padding: '30px 20px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s ease',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      border: 'none'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      {renderCardIcon(chart)}
                      <h3 style={{ 
                        fontSize: '22px', 
                        fontWeight: '600', 
                        marginBottom: '16px',
                        marginTop: '20px',
                        color: '#333'
                      }}>
                        {chart.name}
                      </h3>
                      <p style={{ 
                        color: '#666', 
                        marginBottom: '25px',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        padding: '0 10px'
                      }}>
                        {chart.description}
                      </p>
                    </div>
                    <div style={{ width: '100%' }}>
                      <button 
                        className="btn"
                        style={{
                          width: '100%',
                          padding: '10px',
                          color: chart.color,
                          backgroundColor: 'transparent',
                          border: `1px solid ${chart.color}`,
                          borderRadius: '4px',
                          fontWeight: '500',
                          letterSpacing: '0.5px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = chart.color;
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = chart.color;
                        }}
                      >
                        VIEW ANALYSIS
                      </button>
                    </div>
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
                style={{
                  padding: '8px 15px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
                Back to Chart Selection
              </button>
              <h2 className="mb-0" style={{ fontSize: '24px', fontWeight: '600', color: chartOptions.find(c => c.id === activeChart)?.color }}>
                {chartOptions.find(c => c.id === activeChart)?.name}
              </h2>
              <div className="chart-actions">
                <button className="btn btn-outline-primary" style={{ padding: '8px 15px', fontSize: '14px' }}>
                  <i className="fas fa-question-circle" style={{ marginRight: '8px' }}></i>
                  Help
                </button>
              </div>
            </div>
            
            {/* Render the active chart */}
            <div className="active-chart-container" style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              {renderChart()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}