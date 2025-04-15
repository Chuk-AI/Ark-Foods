import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Button, 
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom 
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  HelpOutline as HelpOutlineIcon,
  ShowChart as ShowChartIcon,
  BarChart as BarChartIcon,
  Calculate as CalculateIcon,
  Spa as SpaIcon
} from '@mui/icons-material';
import Header from '../components/header';
import ForecastLineChart from '../components/ForecastLineChart';
import BreakEvenEstimator from '../components/BreakEvenEstimator';
import HarvestPlanner from '../components/HarvestPlanner';
import VolatilityChart from '../components/VolatilityChart';
import '../styles/dynamic.css';

export default function DynamicAnalytics() {
  // State to track which chart is currently selected
  const [activeChart, setActiveChart] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Available chart options with MUI icons
  const chartOptions = [
    { 
      id: 'forecastLine', 
      name: 'Price Forecast Trends', 
      icon: <ShowChartIcon sx={{ fontSize: 48 }} />,
      color: theme.palette.primary.main,
      description: 'View forecasted price trends based on seasonal patterns'
    },
    { 
      id: 'volatility', 
      name: 'Market Volatility', 
      icon: <BarChartIcon sx={{ fontSize: 48 }} />,
      color: theme.palette.secondary.main,
      description: 'Analyze price fluctuations to identify stable vs. risky market periods'
    },
    { 
      id: 'breakEven', 
      name: 'Break Even Estimator', 
      icon: <CalculateIcon sx={{ fontSize: 48 }} />,
      color: theme.palette.success.main,
      description: 'Analyze profitability and market price comparisons'
    },
    { 
      id: 'harvestPlanner', 
      name: 'Harvest Planner', 
      icon: <SpaIcon sx={{ fontSize: 48 }} />,
      color: theme.palette.warning.main,
      description: 'Optimize your planting and harvesting strategy with data-driven insights'
    }
  ];

  // Handle chart selection with transition
  const handleSelectChart = (chartId) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveChart(chartId);
      setIsTransitioning(false);
    }, 300);
  };

  // Handle back button with transition
  const handleBackToSelection = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveChart(null);
      setIsTransitioning(false);
    }, 300);
  };

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

  return (
    <Box sx={{ 
      backgroundColor: '#f5f7fa',
      minHeight: '100vh',
      pb: 8 
    }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 10, pt: 2 }}>
        {/* Analytics Header with subtle gradient */}
        {/* <Box 
          sx={{ 
            textAlign: 'center', 
            mb: 6,
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(233,245,255,0.5) 50%, rgba(255,255,255,0) 100%)',
            py: 4,
            borderRadius: 2
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: 'primary.main',
              mb: 1
            }}
          >
            Dynamic Analytics Dashboard
          </Typography>
          <Typography 
            variant="h6" 
            component="p"
            color="text.secondary"
            sx={{ maxWidth: 700, mx: 'auto' }}
          >
            Explore market data through interactive visualizations and forecasting tools
          </Typography>
        </Box> */}
        
        <Fade in={!isTransitioning} timeout={500}>
          <Box>
            {!activeChart ? (
              <Grid container spacing={3} sx={{ mb: 6 }}>
                {chartOptions.map((chart) => (
                  <Grid item xs={12} sm={6} md={3} key={chart.id}>
                    <Zoom in={!isTransitioning} style={{ transitionDelay: '100ms' }}>
                      <Card 
                        elevation={2}
                        sx={{ 
                          height: '100%',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 12px 20px -10px rgba(0,0,0,0.2)',
                          }
                        }}
                        onClick={() => handleSelectChart(chart.id)}
                      >
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                          <Box 
                            sx={{
                              borderRadius: '50%',
                              p: 2,
                              mb: 2,
                              backgroundColor: `${chart.color}10`,
                              color: chart.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {chart.icon}
                          </Box>
                          <Typography variant="h5" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                            {chart.name}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mb: 3,
                              textAlign: 'center', 
                              flexGrow: 1 
                            }}
                          >
                            {chart.description}
                          </Typography>
                          <Button 
                            variant="outlined" 
                            color="primary"
                            fullWidth
                            sx={{ 
                              mt: 'auto',
                              borderRadius: 2,
                              py: 1
                            }}
                          >
                            View Analysis
                          </Button>
                        </CardContent>
                      </Card>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box>
                {/* Chart Display with floating toolbar */}
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    mb: 3,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: 2
                  }}
                >
                  <Button
                    startIcon={<ArrowBackIcon />}
                    variant="outlined"
                    onClick={handleBackToSelection}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Back to Selection
                  </Button>
                  
                  <Typography 
                    variant="h5" 
                    component="h2" 
                    sx={{ 
                      fontWeight: 600,
                      color: chartOptions.find(c => c.id === activeChart)?.color
                    }}
                  >
                    {chartOptions.find(c => c.id === activeChart)?.name}
                  </Typography>
                  
                  <Button
                    startIcon={<HelpOutlineIcon />}
                    variant="text"
                    color="primary"
                    size="small"
                  >
                    Help & Guide
                  </Button>
                </Paper>
                
                {/* Actual chart container with shadow and rounded corners */}
                <Paper 
                  elevation={3} 
                  sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    minHeight: '70vh',
                    p: 0
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    {renderChart()}
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}