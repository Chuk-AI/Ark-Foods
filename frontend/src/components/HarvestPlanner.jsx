import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parse, addDays, getQuarter, startOfQuarter, endOfQuarter } from 'date-fns';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  FiberManualRecord as DotIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import '../styles/harvestPlanning.css';

// List of supported pepper varieties
const DEFAULT_COMMODITIES = [
  'Anaheim', 'Cubanelle', 'Jalapeno', 'Poblano', 'Serrano', 'Shishito'
];

// List of common markets
const DEFAULT_MARKETS = [
  "Baltimore", "Boston", "Chicago", "Columbia", "Miami", "New York", "Philadelphia", "Los Angeles"
];

// Styled components for Gantt chart
const GanttContainer = styled(Paper)(({ theme }) => ({
  overflow: 'auto',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(4),
  boxShadow: theme.shadows[2],
}));

const TimelineHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.grey[100],
}));

const VarietyLabelHeader = styled(Box)(({ theme }) => ({
  width: 150,
  padding: theme.spacing(1.5),
  fontWeight: 600,
  borderRight: `1px solid ${theme.palette.divider}`,
  textAlign: 'center',
}));

const QuartersContainer = styled(Box)({
  display: 'flex',
  flex: 1,
});

const QuarterCell = styled(Box)(({ theme }) => ({
  flex: 1,
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '0.85rem',
  padding: theme.spacing(1.5),
  borderRight: `1px solid ${theme.palette.divider}`,
}));

const QuarterDots = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(0.5),
}));

const GanttRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: 50,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const VarietyLabel = styled(Box)(({ theme }) => ({
  width: 150,
  fontWeight: 600,
  padding: theme.spacing(1.5),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.grey[50],
}));

const QuarterCell2 = styled(Box)(({ theme }) => ({
  flex: 1,
  position: 'relative',
  height: '100%',
  borderRight: `1px solid ${theme.palette.divider}`,
}));

const GrowingBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  height: 30,
  top: 10,
  left: '5%',
  width: '90%',
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.75rem',
  color: theme.palette.common.white,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  backgroundColor: theme.palette.primary.main,
  zIndex: 1,
}));

const HarvestBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  height: 30,
  top: 10,
  left: '5%',
  width: '90%',
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.75rem',
  color: theme.palette.common.white,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  backgroundColor: theme.palette.success.main,
  zIndex: 2,
}));

const SellingBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  height: 30,
  top: 10,
  left: '5%',
  width: '90%',
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.75rem',
  color: theme.palette.common.white,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  backgroundColor: theme.palette.warning.main,
  zIndex: 3,
}));

const HarvestPlanningChart = () => {
  const [commoditiesList, setCommoditiesList] = useState(DEFAULT_COMMODITIES);
  const [marketsList, setMarketsList] = useState(DEFAULT_MARKETS);
  const [varieties, setVarieties] = useState([
    { 
      id: 1, 
      name: '', 
      plantingDate: '', 
      harvestingDate: '', 
      growingDays: '', 
      market: 'National' // Default market
    }
  ]);
  const [planningData, setPlanningData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add a new variety row
  const addVariety = () => {
    setVarieties([
      ...varieties,
      { 
        id: varieties.length + 1, 
        name: '', 
        plantingDate: '', 
        harvestingDate: '', 
        growingDays: '', 
        market: 'National' // Default market
      }
    ]);
  };
  
  // Load commodities from external source if needed
  useEffect(() => {
    // If you want to fetch commodities from an API endpoint in the future
    // This is where you would do it
    // For now, we're using the default list
  }, []);
  
  // Remove a variety row
  const removeVariety = (id) => {
    if (varieties.length > 1) {
      setVarieties(varieties.filter(variety => variety.id !== id));
    }
  };
  
  // Handle input change
  const handleInputChange = (id, field, value) => {
    const updatedVarieties = varieties.map(variety => {
      if (variety.id === id) {
        const updatedVariety = { ...variety, [field]: value };
        
        // Auto-calculate growing days or harvest date based on input
        if (field === 'plantingDate' || field === 'harvestingDate') {
          if (updatedVariety.plantingDate && updatedVariety.harvestingDate) {
            const plantDate = new Date(updatedVariety.plantingDate);
            const harvestDate = new Date(updatedVariety.harvestingDate);
            const daysDiff = Math.round((harvestDate - plantDate) / (1000 * 60 * 60 * 24));
            updatedVariety.growingDays = daysDiff > 0 ? daysDiff : '';
          }
        } else if (field === 'growingDays') {
          if (updatedVariety.plantingDate && updatedVariety.growingDays) {
            const plantDate = new Date(updatedVariety.plantingDate);
            const calculatedHarvestDate = addDays(plantDate, parseInt(updatedVariety.growingDays));
            updatedVariety.harvestingDate = format(calculatedHarvestDate, 'yyyy-MM-dd');
          }
        }
        
        return updatedVariety;
      }
      return variety;
    });
    
    setVarieties(updatedVarieties);
  };
  
  // Submit the planning data to the server
  const submitPlanningData = async () => {
    // Validate input data
    const invalidEntries = varieties.filter(
      v => !v.name || !v.plantingDate || !v.harvestingDate || !v.growingDays
    );
    
    if (invalidEntries.length > 0) {
      const missingFields = [];
      
      if (invalidEntries.some(v => !v.name)) {
        missingFields.push("variety selection");
      }
      if (invalidEntries.some(v => !v.plantingDate)) {
        missingFields.push("planting date");
      }
      if (invalidEntries.some(v => !v.harvestingDate)) {
        missingFields.push("harvesting date");
      }
      if (invalidEntries.some(v => !v.growingDays)) {
        missingFields.push("growing days");
      }
      
      setError(`Please fill in all required fields (${missingFields.join(', ')}) for all varieties.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/harvest_planning', {
        varieties: varieties.map(v => ({
          name: v.name,
          plantingDate: v.plantingDate,
          harvestingDate: v.harvestingDate,
          growingDays: v.growingDays,
          market: v.market || 'National'
        }))
      });
      
      setPlanningData(response.data.varieties);
      setIsLoading(false);
    } catch (err) {
      setError('Error calculating harvest planning: ' + (err.response?.data?.error || err.message));
      setIsLoading(false);
    }
  };
  
  // Calculate the timeline for Gantt chart display
  const calculateTimeline = () => {
    if (!planningData || planningData.length === 0) return null;
    
    // Find earliest and latest dates
    let earliestDate = null;
    let latestDate = null;
    
    planningData.forEach(variety => {
      const plantingDate = new Date(variety.plantingDate);
      const harvestingDate = new Date(variety.harvestingDate);
      const sellingDate = variety.bestSellingTime.date ? new Date(variety.bestSellingTime.date) : null;
      
      // Set earliest date (first planting date)
      if (!earliestDate || plantingDate < earliestDate) {
        earliestDate = new Date(plantingDate);
      }
      
      // Set latest date (last selling date or harvest date if no selling date)
      if (sellingDate) {
        if (!latestDate || sellingDate > latestDate) {
          latestDate = new Date(sellingDate);
        }
      } else if (!latestDate || harvestingDate > latestDate) {
        latestDate = new Date(harvestingDate);
      }
    });
    
    // Add buffer to start and end (one quarter before, one quarter after)
    const quarterStartDate = startOfQuarter(earliestDate);
    quarterStartDate.setMonth(quarterStartDate.getMonth() - 3); // One quarter before
    
    const quarterEndDate = endOfQuarter(latestDate);
    quarterEndDate.setMonth(quarterEndDate.getMonth() + 3); // One quarter after
    
    // Calculate total quarters in timeline
    const yearDiff = quarterEndDate.getFullYear() - quarterStartDate.getFullYear();
    const quarterDiff = getQuarter(quarterEndDate) - getQuarter(quarterStartDate);
    const totalQuarters = yearDiff * 4 + quarterDiff + 1;
    
    return {
      start: quarterStartDate,
      end: quarterEndDate,
      totalQuarters: totalQuarters
    };
  };
  
  // Generate quarter labels dynamically based on timeline
  const generateQuarterLabels = (timeline) => {
    if (!timeline) return [];
    
    const labels = [];
    const startDate = new Date(timeline.start);
    const startQuarter = getQuarter(startDate);
    const startYear = startDate.getFullYear();
    
    for (let i = 0; i < timeline.totalQuarters; i++) {
      const quarterIndex = (startQuarter + i - 1) % 4 + 1; // Quarters are 1-based (Q1, Q2, Q3, Q4)
      const year = startYear + Math.floor((startQuarter + i - 1) / 4);
      labels.push({
        quarter: quarterIndex,
        year: year,
        label: `Q${quarterIndex} ${year}`
      });
    }
    
    return labels;
  };
  
  // Function to convert season and year to a quarter index in our dynamic timeline
  const getQuarterIndexForSeason = (season, year, timeline) => {
    if (!timeline || !season || !year) return 0;
    
    // Map seasons to quarters
    let quarterNum;
    switch(season) {
      case 'Winter': quarterNum = 1; break; // Q1 (Jan-Mar)
      case 'Spring': quarterNum = 2; break; // Q2 (Apr-Jun)
      case 'Summer': quarterNum = 3; break; // Q3 (Jul-Sep)
      case 'Autumn': quarterNum = 4; break; // Q4 (Oct-Dec)
      default: quarterNum = 1;
    }
    
    const startQuarter = getQuarter(timeline.start);
    const startYear = timeline.start.getFullYear();
    
    // Calculate quarters between timeline start and season
    const quarterDiff = (year - startYear) * 4 + (quarterNum - startQuarter);
    
    return Math.max(0, quarterDiff);
  };

  // Helper function to get quarter index for a date
  const getQuarterIndexForDate = (date, timeline) => {
    if (!timeline || !date) return 0;
    
    const startQuarter = getQuarter(timeline.start);
    const startYear = timeline.start.getFullYear();
    
    const dateQuarter = getQuarter(date);
    const dateYear = date.getFullYear();
    
    // Calculate quarters between timeline start and date
    const quarterDiff = (dateYear - startYear) * 4 + (dateQuarter - startQuarter);
    
    return Math.max(0, quarterDiff);
  };

  // Helper function to determine activity in quarter
  const getActivityInQuarter = (quarterLabel, plantingDate, harvestingDate, sellingDate) => {
    // Create a date representing the first day of the quarter
    const quarterDate = new Date(quarterLabel.year, (quarterLabel.quarter - 1) * 3, 1);
    const quarterEndDate = new Date(quarterDate);
    quarterEndDate.setMonth(quarterEndDate.getMonth() + 3);
    quarterEndDate.setDate(0); // Last day of the last month in quarter
    
    // Check which activities fall in this quarter
    const isPlanting = plantingDate >= quarterDate && plantingDate <= quarterEndDate;
    const isHarvesting = harvestingDate >= quarterDate && harvestingDate <= quarterEndDate;
    const isSelling = sellingDate && sellingDate >= quarterDate && sellingDate <= quarterEndDate;
    const isGrowing = plantingDate <= quarterEndDate && harvestingDate >= quarterDate && !isHarvesting;
    
    return {
      isPlanting,
      isGrowing,
      isHarvesting,
      isSelling,
      // Calculate months of activity in this quarter (0-3)
      activeDuration: Math.min(3, Math.max(0, Math.min(3, // Limit to max 3 months
        Math.ceil((Math.min(harvestingDate, quarterEndDate) - 
                   Math.max(plantingDate, quarterDate)) / 
                   (1000 * 60 * 60 * 24 * 30))
      )))
    };
  };
  
  const timeline = calculateTimeline();
  const quarterLabels = generateQuarterLabels(timeline);
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom color="primary">
        Harvest Planning Chart
      </Typography>
      
      <Typography variant="body1" paragraph color="text.secondary">
        Plan your planting based on the best selling times. Input your varieties, 
        planting dates, and growing days to see when to harvest and sell for maximum profit.
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            Variety Input
          </Typography>
          
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Variety Name</TableCell>
                  <TableCell>Planting Date</TableCell>
                  <TableCell>Growing Days</TableCell>
                  <TableCell>Harvesting Date</TableCell>
                  <TableCell>Market Location</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {varieties.map(variety => (
                  <TableRow key={variety.id}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.name}
                          onChange={(e) => handleInputChange(variety.id, 'name', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select a variety</em>
                          </MenuItem>
                          {commoditiesList.map((commodity, index) => (
                            <MenuItem key={index} value={commodity}>
                              {commodity}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        value={variety.plantingDate}
                        onChange={(e) => handleInputChange(variety.id, 'plantingDate', e.target.value)}
                        InputProps={{
                          startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={variety.growingDays}
                        onChange={(e) => handleInputChange(variety.id, 'growingDays', e.target.value)}
                        placeholder="Days"
                        inputProps={{ min: 1 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        value={variety.harvestingDate}
                        onChange={(e) => handleInputChange(variety.id, 'harvestingDate', e.target.value)}
                        InputProps={{
                          startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.market || 'National'}
                          onChange={(e) => handleInputChange(variety.id, 'market', e.target.value)}
                        >
                          {marketsList.map((market, index) => (
                            <MenuItem key={index} value={market}>
                              {market}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Remove variety">
                        <span>
                          <IconButton
                            color="error"
                            onClick={() => removeVariety(variety.id)}
                            disabled={varieties.length <= 1}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={addVariety}
            >
              Add Variety
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={submitPlanningData}
              disabled={isLoading}
              sx={{ minWidth: 180 }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Calculating...
                </Box>
              ) : 'Calculate Harvest Plan'}
            </Button>
          </Stack>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {planningData.length > 0 && timeline && (
        <Card>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              Harvest Planning Results
            </Typography>
            
            <GanttContainer>
              <TimelineHeader>
                <VarietyLabelHeader>Variety</VarietyLabelHeader>
                <QuartersContainer>
                  {/* Generate quarter headers dynamically */}
                  {quarterLabels.map((quarter, index) => (
                    <QuarterCell key={index}>
                      {quarter.label}
                      <QuarterDots>
                      <DotIcon fontSize="small" sx={{ mr: 0.5, color: '#bdbdbd' }} />
                      <DotIcon fontSize="small" sx={{ mr: 0.5, color: '#bdbdbd' }} />
                      <DotIcon fontSize="small" sx={{ color: '#bdbdbd' }} />
                    </QuarterDots>
                    </QuarterCell>
                  ))}
                </QuartersContainer>
              </TimelineHeader>
              
              {/* Gantt chart rows */}
              {planningData.map((variety, index) => {
                const plantingDate = new Date(variety.plantingDate);
                const harvestingDate = new Date(variety.harvestingDate);
                const sellingDate = variety.bestSellingTime.date ? new Date(variety.bestSellingTime.date) : null;
                
                return (
                  <GanttRow key={index}>
                    <VarietyLabel>{variety.name}</VarietyLabel>
                    <QuartersContainer>
                      {quarterLabels.map((quarter, quarterIndex) => {
                        // Determine activities in this quarter
                        const activity = getActivityInQuarter(quarter, plantingDate, harvestingDate, sellingDate);
                        
                        // Get quarter for harvest and selling
                        const harvestQuarter = getQuarterIndexForDate(harvestingDate, timeline);
                        const sellingQuarter = sellingDate ? getQuarterIndexForDate(sellingDate, timeline) : -1;
                        
                        return (
                          <QuarterCell2 key={quarterIndex}>
                            {/* Show growing bar if activity in this quarter */}
                            {activity.isGrowing && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%' }}>
                              <Tooltip title={`Growing: ${format(plantingDate, 'MMM dd, yyyy')} - ${format(harvestingDate, 'MMM dd, yyyy')}`}>
                                <GrowingBar>Growing</GrowingBar>
                              </Tooltip>
                              <Box sx={{ mt: 2, display: 'flex' }}>
                                {/* Show dots indicating months active (1-3) */}
                                {[...Array(3)].map((_, i) => (
                                  <DotIcon 
                                    key={i}
                                    fontSize="small" 
                                    sx={{ 
                                      mr: i < 2 ? 0.5 : 0,
                                      color: i < activity.activeDuration ? '#2196f3' : '#bdbdbd',
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                            
                            {/* Show harvesting indicator */}
                            {quarterIndex === harvestQuarter && (
                              <Tooltip title={`Harvesting: ${format(harvestingDate, 'MMM dd, yyyy')}`}>
                                <HarvestBar>Harvest</HarvestBar>
                              </Tooltip>
                            )}
                            
                            {/* Show selling time */}
                            {quarterIndex === sellingQuarter && sellingQuarter >= harvestQuarter && (
                              <Tooltip title={`Best Selling Time: ${variety.bestSellingTime.season} ${variety.bestSellingTime.year} (~${format(sellingDate, 'MMM dd')}) - Est. Price: $${variety.bestSellingTime.price}`}>
                                <SellingBar>Best Selling</SellingBar>
                              </Tooltip>
                            )}
                          </QuarterCell2>
                        );
                      })}
                    </QuartersContainer>
                  </GanttRow>
                );
              })}
            </GanttContainer>
            
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
              Summary
            </Typography>
            
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Variety</TableCell>
                    <TableCell>Planting Date</TableCell>
                    <TableCell>Harvesting Date</TableCell>
                    <TableCell>Best Selling Time</TableCell>
                    <TableCell>Estimated Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {planningData.map((variety, index) => (
                    <TableRow key={index}>
                      <TableCell>{variety.name}</TableCell>
                      <TableCell>{format(new Date(variety.plantingDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(variety.harvestingDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {variety.bestSellingTime.season} {variety.bestSellingTime.year}
                        {variety.bestSellingTime.date && ` (~${format(new Date(variety.bestSellingTime.date), 'MMM dd')})`}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>${variety.bestSellingTime.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Planning Insights
              </Typography>
              
              <Paper sx={{ p: 2 }}>
                {planningData.map((variety, index) => {
                  const plantingDate = new Date(variety.plantingDate);
                  const bestSellingDate = variety.bestSellingTime.date ? new Date(variety.bestSellingTime.date) : null;
                  
                  let recommendation = '';
                  if (bestSellingDate) {
                    const optimalPlantingDate = addDays(bestSellingDate, -parseInt(variety.growingDays));
                    const daysDiff = Math.round((optimalPlantingDate - plantingDate) / (1000 * 60 * 60 * 24));
                    
                    if (Math.abs(daysDiff) <= 7) {
                      recommendation = `Your planting date is optimal for the best market price.`;
                    } else if (daysDiff > 0) {
                      recommendation = `Consider planting about ${daysDiff} days later (around ${format(optimalPlantingDate, 'MMM dd')}) to hit the peak market price.`;
                    } else {
                      recommendation = `Consider planting about ${Math.abs(daysDiff)} days earlier (around ${format(optimalPlantingDate, 'MMM dd')}) to hit the peak market price.`;
                    }
                  }
                  
                  return recommendation ? (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <InfoIcon color="info" sx={{ mr: 2, mt: 0.5 }} />
                      <Box>
                        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold' }}>
                          {variety.name}:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {recommendation}
                        </Typography>
                      </Box>
                    </Box>
                  ) : null;
                })}
              </Paper>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default HarvestPlanningChart;