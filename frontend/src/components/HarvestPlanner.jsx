import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Typography,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  styled,
  useTheme,
  Container,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  LocalFlorist as LocalFloristIcon,
  DateRange as DateRangeIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  AccountBalance as AccountBalanceIcon,
  Store as StoreIcon,
  DataUsage as DataUsageIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FiberManualRecord as DotIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import "../styles/harvestPlanning.css";

const format = (date, pattern) => {
  const d = new Date(date);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (pattern === "MMM dd, yyyy") {
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } else if (pattern === "MMM dd") {
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
  return d.toLocaleDateString();
};

const getQuarter = (date) => {
  const month = date.getMonth();
  return Math.floor(month / 3) + 1;
};

const startOfQuarter = (date) => {
  const d = new Date(date);
  const quarter = getQuarter(d);
  d.setMonth((quarter - 1) * 3);
  d.setDate(1);
  return d;
};

const endOfQuarter = (date) => {
  const d = new Date(date);
  const quarter = getQuarter(d);
  d.setMonth(quarter * 3, 0);
  return d;
};

// List of supported pepper varieties
const DEFAULT_COMMODITIES = [
  "Anaheim",
  "Cubanelles",
  "Fresno",
  "Habanero",
  "Hungarian Wax",
  "Jalapeno",
  "Long Hot",
  "Poblano",
  "Serrano",
  "Shishito",
];

// List of common markets
const DEFAULT_MARKETS = [
  "Select All",
  "Baltimore",
  "Boston",
  "Chicago",
  "Columbia",
  "Miami",
  "New York",
  "Philadelphia",
  "Los Angeles",
  "Detroit",
  "Atlanta",
];

// Harvest and Selling periods
const PERIOD_OPTIONS = [
  { value: 1, label: "1 Month" },
  { value: 2, label: "2 Months" },
  { value: 3, label: "3 Months" },
];

// Styled components for Gantt chart
const GanttContainer = styled(Paper)(({ theme }) => ({
  overflow: "auto",
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(4),
  boxShadow: theme.shadows[2],
}));

const TimelineHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.grey[100],
}));

const VarietyLabelHeader = styled(Box)(({ theme }) => ({
  width: 150,
  padding: theme.spacing(1.5),
  fontWeight: 600,
  borderRight: `1px solid ${theme.palette.divider}`,
  textAlign: "center",
}));

const QuartersContainer = styled(Box)({
  display: "flex",
  flex: 1,
});

const QuarterCell = styled(Box)(({ theme }) => ({
  flex: 1,
  textAlign: "center",
  fontWeight: 600,
  fontSize: "0.85rem",
  padding: theme.spacing(1.5),
  borderRight: `1px solid ${theme.palette.divider}`,
}));

const QuarterDots = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  marginTop: theme.spacing(0.5),
}));

const GanttRow = styled(Box)(({ theme }) => ({
  display: "flex",
  height: 50,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const VarietyLabel = styled(Box)(({ theme }) => ({
  width: 150,
  fontWeight: 600,
  padding: theme.spacing(1.5),
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.grey[50],
}));

const QuarterCell2 = styled(Box)(({ theme }) => ({
  flex: 1,
  position: "relative",
  height: "100%",
  borderRight: `1px solid ${theme.palette.divider}`,
}));

// Z-index values for the styled components
// These are already correct in your code, but here for reference:

const GrowingBar = styled(Box)(({ theme }) => ({
  position: "absolute",
  height: 30,
  top: 10,
  left: "5%",
  width: "90%",
  borderRadius: theme.shape.borderRadius,
  fontSize: "0.75rem",
  color: theme.palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  backgroundColor: theme.palette.primary.main,
  zIndex: 1, // Growing has lowest z-index
}));

const HarvestBar = styled(Box)(({ theme }) => ({
  position: "absolute",
  height: 30,
  top: 10,
  left: "5%",
  width: "90%",
  borderRadius: theme.shape.borderRadius,
  fontSize: "0.75rem",
  color: theme.palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  backgroundColor: theme.palette.success.main,
  zIndex: 3, // Harvest has higher z-index than selling
}));

const SellingBar = styled(Box)(({ theme }) => ({
  position: "absolute",
  height: 30,
  top: 10,
  left: "5%",
  width: "90%",
  borderRadius: theme.shape.borderRadius,
  fontSize: "0.75rem",
  color: theme.palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  backgroundColor: theme.palette.warning.main,
  zIndex: 2, // Selling has middle z-index
}));

const HarvestPlanningChart = () => {
  const theme = useTheme();

  const [commoditiesList, setCommoditiesList] = useState(DEFAULT_COMMODITIES);
  const [marketsList, setMarketsList] = useState(DEFAULT_MARKETS);
  const [varieties, setVarieties] = useState([
    {
      id: 1,
      name: "",
      plantingDate: "",
      harvestPeriod: 1, // Default 1 month
      sellingPeriod: 1, // Default 1 month
      growingDays: "",
      market: "Miami", // Default market
      source: "ProduceIQ", // Default source
    },
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
        name: "",
        plantingDate: "",
        harvestPeriod: 1, // Default 1 month
        sellingPeriod: 1, // Default 1 month
        growingDays: "",
        market: "Miami", // Default market
        source: "ProduceIQ", // Default source
      },
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
      setVarieties(varieties.filter((variety) => variety.id !== id));
    }
  };

  // Handle input change
  const handleInputChange = (id, field, value) => {
    const updatedVarieties = varieties.map((variety) => {
      if (variety.id === id) {
        return { ...variety, [field]: value };
      }
      return variety;
    });

    setVarieties(updatedVarieties);
  };

  // Submit the planning data to the server
  const submitPlanningData = async () => {
    // Validate input data
    const invalidEntries = varieties.filter(
      (v) =>
        !v.name ||
        !v.plantingDate ||
        !v.growingDays ||
        !v.harvestPeriod ||
        !v.sellingPeriod,
    );

    if (invalidEntries.length > 0) {
      const missingFields = [];

      if (invalidEntries.some((v) => !v.name)) {
        missingFields.push("variety selection");
      }
      if (invalidEntries.some((v) => !v.plantingDate)) {
        missingFields.push("planting date");
      }
      if (invalidEntries.some((v) => !v.growingDays)) {
        missingFields.push("growing days");
      }
      if (invalidEntries.some((v) => !v.harvestPeriod)) {
        missingFields.push("harvest period");
      }
      if (invalidEntries.some((v) => !v.sellingPeriod)) {
        missingFields.push("selling period");
      }

      setError(
        `Please fill in all required fields (${missingFields.join(", ")}) for all varieties.`,
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/api/harvest_planning", {
        varieties: varieties.map((v) => ({
          name: v.name,
          plantingDate: v.plantingDate,
          harvestPeriod: v.harvestPeriod,
          sellingPeriod: v.sellingPeriod,
          growingDays: v.growingDays,
          market: v.market || "Miami",
          source: v.source || "ProduceIQ",
        })),
      });

      setPlanningData(response.data.varieties);
      setIsLoading(false);
    } catch (err) {
      setError(
        "Error calculating harvest planning: " +
          (err.response?.data?.error || err.message),
      );
      setIsLoading(false);
    }
  };

  // Calculate the timeline for Gantt chart display
  const calculateTimeline = () => {
    if (!planningData || planningData.length === 0) return null;

    // Find earliest and latest dates
    let earliestDate = null;
    let latestDate = null;

    planningData.forEach((variety) => {
      const plantingDate = new Date(variety.plantingDate);
      const harvestStartDate = new Date(variety.harvestStartDate);
      const harvestEndDate = new Date(variety.harvestEndDate);
      const sellingEndDate = new Date(variety.sellingEndDate);
      const bestSellingDate = variety.bestSellingTime.date
        ? new Date(variety.bestSellingTime.date)
        : null;

      // Set earliest date (first planting date)
      if (!earliestDate || plantingDate < earliestDate) {
        earliestDate = new Date(plantingDate);
      }

      // Set latest date (selling end or best selling date, whichever is later)
      const latestDateForVariety =
        bestSellingDate && bestSellingDate > sellingEndDate
          ? bestSellingDate
          : sellingEndDate;
      if (!latestDate || latestDateForVariety > latestDate) {
        latestDate = new Date(latestDateForVariety);
      }
    });

    // Add buffer to start and end (one quarter before, one quarter after)
    const quarterStartDate = startOfQuarter(earliestDate);
    quarterStartDate.setMonth(quarterStartDate.getMonth() - 3); // One quarter before

    const quarterEndDate = endOfQuarter(latestDate);
    quarterEndDate.setMonth(quarterEndDate.getMonth() + 3); // One quarter after

    // Calculate total quarters in timeline
    const yearDiff =
      quarterEndDate.getFullYear() - quarterStartDate.getFullYear();
    const quarterDiff =
      getQuarter(quarterEndDate) - getQuarter(quarterStartDate);
    const totalQuarters = yearDiff * 4 + quarterDiff + 1;

    return {
      start: quarterStartDate,
      end: quarterEndDate,
      totalQuarters: totalQuarters,
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
      const quarterIndex = ((startQuarter + i - 1) % 4) + 1; // Quarters are 1-based (Q1, Q2, Q3, Q4)
      const year = startYear + Math.floor((startQuarter + i - 1) / 4);
      labels.push({
        quarter: quarterIndex,
        year: year,
        label: `Q${quarterIndex} ${year}`,
      });
    }

    return labels;
  };

  // Helper function to get quarter index for a date
  const getQuarterIndexForDate = (date, timeline) => {
    if (!timeline || !date) return 0;

    const startQuarter = getQuarter(timeline.start);
    const startYear = timeline.start.getFullYear();

    const dateQuarter = getQuarter(date);
    const dateYear = date.getFullYear();

    // Calculate quarters between timeline start and date
    const quarterDiff =
      (dateYear - startYear) * 4 + (dateQuarter - startQuarter);

    return Math.max(0, quarterDiff);
  };

  const getMonthsOfActivityInQuarter = (
    quarterLabel,
    plantingDate,
    harvestStartDate,
    harvestEndDate,
    sellingStartDate,
    sellingEndDate,
    bestSellingDate,
  ) => {
    // Create dates for the first and last day of the quarter
    const quarterStartDate = new Date(
      quarterLabel.year,
      (quarterLabel.quarter - 1) * 3,
      1,
    );
    const quarterEndDate = new Date(
      quarterLabel.year,
      (quarterLabel.quarter - 1) * 3 + 3,
      0,
    );

    // Check for best selling date in this quarter
    const bestSellingInQuarter =
      bestSellingDate &&
      bestSellingDate >= quarterStartDate &&
      bestSellingDate <= quarterEndDate
        ? 1
        : 0;

    // Calculate the start and end of each activity in this quarter
    const plantingInQuarter =
      plantingDate >= quarterStartDate && plantingDate <= quarterEndDate;

    // For growing, harvesting, selling - calculate overlap with quarter
    const growingStart = Math.max(
      plantingDate.getTime(),
      quarterStartDate.getTime(),
    );
    const growingEnd = Math.min(
      harvestStartDate.getTime(),
      quarterEndDate.getTime(),
    );
    const growingMonths =
      growingStart <= growingEnd
        ? Math.ceil((growingEnd - growingStart) / (1000 * 60 * 60 * 24 * 30))
        : 0;

    const harvestingStart = Math.max(
      harvestStartDate.getTime(),
      quarterStartDate.getTime(),
    );
    const harvestingEnd = Math.min(
      harvestEndDate.getTime(),
      quarterEndDate.getTime(),
    );
    const harvestingMonths =
      harvestingStart <= harvestingEnd
        ? Math.ceil(
            (harvestingEnd - harvestingStart) / (1000 * 60 * 60 * 24 * 30),
          )
        : 0;

    const sellingStart = Math.max(
      sellingStartDate.getTime(),
      quarterStartDate.getTime(),
    );
    const sellingEnd = Math.min(
      sellingEndDate.getTime(),
      quarterEndDate.getTime(),
    );
    const sellingMonths =
      sellingStart <= sellingEnd
        ? Math.ceil((sellingEnd - sellingStart) / (1000 * 60 * 60 * 24 * 30))
        : 0;

    // Ensure we don't exceed 3 months total
    const totalMonths = Math.min(
      plantingInQuarter
        ? 1
        : 0 + growingMonths + harvestingMonths + sellingMonths,
      3,
    );

    return {
      planting: plantingInQuarter ? 1 : 0,
      growing: growingMonths,
      harvesting: harvestingMonths,
      bestSelling: bestSellingInQuarter,
      selling: sellingMonths,
      total: totalMonths,
    };
  };

  // Helper function to determine activity in quarter
  const getActivityInQuarter = (
    quarterLabel,
    plantingDate,
    harvestStartDate,
    harvestEndDate,
    sellingStartDate,
    sellingEndDate,
  ) => {
    // Create dates representing the first and last day of the quarter
    const quarterDate = new Date(
      quarterLabel.year,
      (quarterLabel.quarter - 1) * 3,
      1,
    );
    const quarterEndDate = new Date(quarterDate);
    quarterEndDate.setMonth(quarterEndDate.getMonth() + 3);
    quarterEndDate.setDate(0); // Last day of the last month in quarter

    // Check exact day for planting to ensure it's always shown
    const isPlantingDay =
      plantingDate.getFullYear() === quarterLabel.year &&
      Math.floor(plantingDate.getMonth() / 3) + 1 === quarterLabel.quarter;

    // Check for activities spanning quarters
    const isPlanting =
      isPlantingDay ||
      (plantingDate >= quarterDate && plantingDate <= quarterEndDate);

    // Check if any part of the harvest period occurs in this quarter
    const isHarvesting = !(
      harvestEndDate < quarterDate || harvestStartDate > quarterEndDate
    );

    // Check if any part of the selling period occurs in this quarter
    const isSelling =
      sellingStartDate &&
      sellingEndDate &&
      !(sellingEndDate < quarterDate || sellingStartDate > quarterEndDate);

    // Improved growing detection - check if any part of growing period occurs in this quarter
    const isGrowing =
      plantingDate < quarterEndDate && harvestStartDate > quarterDate;

    // Calculate months of activity in this quarter (0-3)
    const activeDuration = Math.min(
      3,
      Math.max(
        0,
        Math.min(
          3,
          Math.ceil(
            (Math.min(harvestStartDate, quarterEndDate) -
              Math.max(plantingDate, quarterDate)) /
              (1000 * 60 * 60 * 24 * 30),
          ),
        ),
      ),
    );

    return {
      isPlanting,
      isGrowing,
      isHarvesting,
      isSelling,
      activeDuration,
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
        Plan your planting based on the best selling times. Input your
        varieties, planting dates, and growing days to see when to harvest and
        sell for maximum profit.
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
                  <TableCell>Harvest Period</TableCell>
                  <TableCell>Selling Period</TableCell>
                  <TableCell>Market Location</TableCell>
                  <TableCell>Data Source</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {varieties.map((variety) => (
                  <TableRow key={variety.id}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.name}
                          onChange={(e) =>
                            handleInputChange(
                              variety.id,
                              "name",
                              e.target.value,
                            )
                          }
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
                        onChange={(e) =>
                          handleInputChange(
                            variety.id,
                            "plantingDate",
                            e.target.value,
                          )
                        }
                        InputProps={{
                          startAdornment: (
                            <CalendarIcon
                              sx={{ mr: 1, color: "text.secondary" }}
                            />
                          ),
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={variety.growingDays}
                        onChange={(e) =>
                          handleInputChange(
                            variety.id,
                            "growingDays",
                            e.target.value,
                          )
                        }
                        placeholder="Days"
                        inputProps={{ min: 1 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.harvestPeriod}
                          onChange={(e) =>
                            handleInputChange(
                              variety.id,
                              "harvestPeriod",
                              e.target.value,
                            )
                          }
                        >
                          {PERIOD_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.sellingPeriod}
                          onChange={(e) =>
                            handleInputChange(
                              variety.id,
                              "sellingPeriod",
                              e.target.value,
                            )
                          }
                        >
                          {PERIOD_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.market || "Miami"}
                          onChange={(e) =>
                            handleInputChange(
                              variety.id,
                              "market",
                              e.target.value,
                            )
                          }
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
                      <FormControl fullWidth size="small">
                        <Select
                          value={variety.source || "ProduceIQ"}
                          onChange={(e) =>
                            handleInputChange(
                              variety.id,
                              "source",
                              e.target.value,
                            )
                          }
                        >
                          <MenuItem value="ProduceIQ">ProduceIQ</MenuItem>
                          <MenuItem value="USDA">USDA</MenuItem>
                          <MenuItem value="ProduceIQ,USDA">
                            Both Sources
                          </MenuItem>
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
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Calculating...
                </Box>
              ) : (
                "Calculate Harvest Plan"
              )}
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
                  {quarterLabels.map((quarter, index) => {
                    // For each variety, calculate activity months
                    const activityMonths = planningData.map((variety) => {
                      const plantingDate = new Date(variety.plantingDate);
                      const harvestStartDate = new Date(
                        variety.harvestStartDate,
                      );
                      const harvestEndDate = new Date(variety.harvestEndDate);
                      const sellingStartDate = new Date(
                        variety.sellingStartDate,
                      );
                      const sellingEndDate = new Date(variety.sellingEndDate);
                      const bestSellingDate = variety.bestSellingTime.date
                        ? new Date(variety.bestSellingTime.date)
                        : null;

                      return getMonthsOfActivityInQuarter(
                        quarter,
                        plantingDate,
                        harvestStartDate,
                        harvestEndDate,
                        sellingStartDate,
                        sellingEndDate,
                        bestSellingDate,
                      );
                    });

                    // Get activity for first variety
                    const activityData = activityMonths[0] || {
                      planting: 0,
                      growing: 0,
                      harvesting: 0,
                      selling: 0,
                    };

                    // Prioritize coloring based on importance and time allocation
                    const dotColors = [];

                    // First attempt to assign colors based on months of each activity
                    if (activityData.bestSelling > 0)
                      dotColors.push(theme.palette.error.main);

                    if (activityData.planting > 0)
                      dotColors.push(theme.palette.info.main);
                    if (activityData.growing > 0) {
                      // Add dots for growing based on duration (max 3)
                      for (
                        let i = 0;
                        i <
                        Math.min(activityData.growing, 3 - dotColors.length);
                        i++
                      ) {
                        dotColors.push(theme.palette.primary.main);
                      }
                    }
                    if (activityData.harvesting > 0) {
                      // Add dots for harvesting based on duration
                      for (
                        let i = 0;
                        i <
                        Math.min(activityData.harvesting, 3 - dotColors.length);
                        i++
                      ) {
                        dotColors.push(theme.palette.success.main);
                      }
                    }
                    if (activityData.selling > 0) {
                      // Add dots for selling based on duration
                      for (
                        let i = 0;
                        i <
                        Math.min(activityData.selling, 3 - dotColors.length);
                        i++
                      ) {
                        dotColors.push(theme.palette.warning.main);
                      }
                    }

                    // Fill in any remaining dots with gray
                    while (dotColors.length < 3) {
                      dotColors.push("#bdbdbd");
                    }

                    return (
                      <QuarterCell key={index}>
                        {quarter.label}
                        <QuarterDots>
                          <DotIcon
                            fontSize="small"
                            sx={{ mr: 0.5, color: dotColors[0] }}
                          />
                          <DotIcon
                            fontSize="small"
                            sx={{ mr: 0.5, color: dotColors[1] }}
                          />
                          <DotIcon
                            fontSize="small"
                            sx={{ color: dotColors[2] }}
                          />
                        </QuarterDots>
                      </QuarterCell>
                    );
                  })}
                </QuartersContainer>
              </TimelineHeader>

              {/* Gantt chart rows */}
              {planningData.map((variety, index) => {
                const plantingDate = new Date(variety.plantingDate);
                const harvestStartDate = new Date(variety.harvestStartDate);
                const harvestEndDate = new Date(variety.harvestEndDate);
                const sellingStartDate = new Date(variety.sellingStartDate);
                const sellingEndDate = new Date(variety.sellingEndDate);
                const bestSellingDate = variety.bestSellingTime.date
                  ? new Date(variety.bestSellingTime.date)
                  : null;

                return (
                  <GanttRow key={index}>
                    <VarietyLabel>{variety.name}</VarietyLabel>
                    <QuartersContainer>
                      {quarterLabels.map((quarter, quarterIndex) => {
                        // Determine activities in this quarter
                        const activity = getActivityInQuarter(
                          quarter,
                          plantingDate,
                          harvestStartDate,
                          harvestEndDate,
                          sellingStartDate,
                          sellingEndDate,
                        );

                        const activitiesCount = [
                          activity.isPlanting,
                          activity.isGrowing,
                          activity.isHarvesting,
                          activity.isSelling,
                        ].filter(Boolean).length;

                        return (
                          <QuarterCell2 key={quarterIndex}>
                            {/* Show planting marker */}
                            {activity.isPlanting && (
                              <Tooltip
                                title={`Planting: ${format(plantingDate, "MMM dd, yyyy")}`}
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    height: 30,
                                    top: 10,
                                    left: activitiesCount > 1 ? "2%" : "5%",
                                    width: activitiesCount > 1 ? "45%" : "90%",
                                    // borderRadius: '5px',
                                    backgroundColor: theme.palette.info.main,
                                    zIndex: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: theme.palette.common.white,
                                    fontSize:
                                      activitiesCount > 1
                                        ? "0.7rem"
                                        : "0.75rem",
                                  }}
                                >
                                  {activitiesCount > 1 ? "Plant" : "Planting"}
                                </Box>
                              </Tooltip>
                            )}

                            {/* Show growing bar */}
                            {activity.isGrowing && (
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems:
                                    activitiesCount > 1
                                      ? "flex-start"
                                      : "center",
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                <Tooltip
                                  title={`Growing: ${format(plantingDate, "MMM dd, yyyy")} - ${format(harvestStartDate, "MMM dd, yyyy")}`}
                                >
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      height: 30,
                                      top: 10,
                                      left: activitiesCount > 1 ? "2%" : "5%",
                                      width:
                                        activitiesCount > 1 ? "45%" : "90%",
                                      // borderRadius: theme.shape.borderRadius,
                                      backgroundColor:
                                        theme.palette.primary.main,
                                      zIndex: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: theme.palette.common.white,
                                      fontSize:
                                        activitiesCount > 1
                                          ? "0.7rem"
                                          : "0.75rem",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {activitiesCount > 1 ? "Grow" : "Growing"}
                                  </Box>
                                </Tooltip>
                              </Box>
                            )}

                            {/* Show harvesting indicator */}
                            {activity.isHarvesting && (
                              <Tooltip
                                title={`Harvesting: ${format(harvestStartDate, "MMM dd, yyyy")} - ${format(harvestEndDate, "MMM dd, yyyy")}`}
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    height: 30,
                                    top: 10,
                                    // Adjust position based on which activities are present
                                    left: activity.isSelling
                                      ? "2%"
                                      : activitiesCount > 1
                                        ? "50%"
                                        : "5%",
                                    width: activity.isSelling
                                      ? "45%"
                                      : activitiesCount > 1
                                        ? "45%"
                                        : "90%",
                                    // borderRadius: theme.shape.borderRadius,
                                    backgroundColor: theme.palette.success.main,
                                    zIndex: 3,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: theme.palette.common.white,
                                    fontSize:
                                      activitiesCount > 1
                                        ? "0.7rem"
                                        : "0.75rem",
                                    overflow: "hidden",
                                  }}
                                >
                                  {activitiesCount > 1
                                    ? "Harvest"
                                    : "Harvesting"}
                                </Box>
                              </Tooltip>
                            )}

                            {activity.isSelling && (
                              <Tooltip
                                title={`Selling Period: ${format(sellingStartDate, "MMM dd, yyyy")} - ${format(sellingEndDate, "MMM dd, yyyy")}`}
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    height: 30,
                                    top: 10,
                                    // Adjust position based on which activities are present
                                    left: activity.isHarvesting
                                      ? "50%"
                                      : activitiesCount > 1
                                        ? "50%"
                                        : "5%",
                                    width: activity.isHarvesting
                                      ? "45%"
                                      : activitiesCount > 1
                                        ? "45%"
                                        : "90%",
                                    // borderRadius: theme.shape.borderRadius,
                                    backgroundColor: theme.palette.warning.main,
                                    zIndex: 2,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: theme.palette.common.white,
                                    fontSize:
                                      activitiesCount > 1
                                        ? "0.7rem"
                                        : "0.75rem",
                                    overflow: "hidden",
                                  }}
                                >
                                  {activitiesCount > 1 ? "Sell" : "Selling"}
                                </Box>
                              </Tooltip>
                            )}

                            {/* Show best selling time if applicable */}
                            {bestSellingDate &&
                              bestSellingDate.getFullYear() === quarter.year &&
                              Math.floor(bestSellingDate.getMonth() / 3) + 1 ===
                                quarter.quarter && (
                                <Tooltip
                                  title={`Best Price Point: ${variety.bestSellingTime.season} ${variety.bestSellingTime.year} (${format(bestSellingDate, "MMM dd")}) - $${variety.bestSellingTime.price}`}
                                >
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      height: 30,
                                      top: 10,
                                      // Better positioning logic based on which specific activities are present
                                      left: activity.isSelling ? "50%" : "5%", // If selling is in same quarter, position on right
                                      width: activity.isSelling
                                        ? "45%"
                                        : activitiesCount > 0
                                          ? "45%"
                                          : "90%",
                                      // borderRadius: '5px',
                                      backgroundColor: theme.palette.error.main,
                                      zIndex: 5,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: theme.palette.common.white,
                                      fontSize: "0.7rem",
                                    }}
                                  >
                                    {activity.isSelling
                                      ? "Best $"
                                      : "Best Price"}
                                  </Box>
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

            {planningData.length > 0 && timeline && (
              <Card sx={{ mt: 4 }}>
                <CardContent>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ color: "primary.main", mb: 3 }}
                  >
                    Planning Summary & Price Analysis
                  </Typography>

                  <Grid container spacing={3}>
                    {planningData.map((variety, index) => {
                      const priceDifference =
                        variety.bestSellingTime.price -
                        variety.expectedSellingPrice;
                      const potentialIncrease = priceDifference * 100; // Per 100 units

                      return (
                        <Grid item xs={12} key={index}>
                          <Paper
                            elevation={2}
                            sx={{
                              p: 3,
                              borderLeft: 6,
                              borderColor:
                                priceDifference > 0
                                  ? "success.main"
                                  : "primary.main",
                              "&:hover": {
                                boxShadow: 6,
                                transform: "translateY(-2px)",
                                transition: "all 0.3s ease-in-out",
                              },
                            }}
                          >
                            {/* Header Section */}
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 2,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  color: "primary.main",
                                  fontWeight: "bold",
                                }}
                              >
                                {variety.name}
                              </Typography>
                              <Chip
                                label={variety.source}
                                color="primary"
                                size="small"
                                variant="outlined"
                              />
                            </Box>

                            <Divider sx={{ mb: 2 }} />

                            {/* Timeline Information */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                              <Grid item xs={12} md={3}>
                                <Box
                                  sx={{
                                    textAlign: "center",
                                    p: 2,
                                    backgroundColor: "grey.50",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Planting Date
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                  >
                                    {format(
                                      new Date(variety.plantingDate),
                                      "MMM dd, yyyy",
                                    )}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <Box
                                  sx={{
                                    textAlign: "center",
                                    p: 2,
                                    backgroundColor: "grey.50",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Harvest Period
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                  >
                                    {format(
                                      new Date(variety.harvestStartDate),
                                      "MMM dd",
                                    )}{" "}
                                    -{" "}
                                    {format(
                                      new Date(variety.harvestEndDate),
                                      "MMM dd, yyyy",
                                    )}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <Box
                                  sx={{
                                    textAlign: "center",
                                    p: 2,
                                    backgroundColor: "grey.50",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Selling Period
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                  >
                                    {format(
                                      new Date(variety.sellingStartDate),
                                      "MMM dd",
                                    )}{" "}
                                    -{" "}
                                    {format(
                                      new Date(variety.sellingEndDate),
                                      "MMM dd, yyyy",
                                    )}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={12} md={3}>
                                <Box
                                  sx={{
                                    textAlign: "center",
                                    p: 2,
                                    backgroundColor: "success.light",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    Best Selling Time
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                  >
                                    {variety.bestSellingTime.season}{" "}
                                    {variety.bestSellingTime.year}
                                  </Typography>
                                  {variety.bestSellingTime.date && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      (~
                                      {format(
                                        new Date(variety.bestSellingTime.date),
                                        "MMM dd",
                                      )}
                                      )
                                    </Typography>
                                  )}
                                </Box>
                              </Grid>
                            </Grid>

                            {/* Price Analysis Section */}
                            <Box
                              sx={{
                                backgroundColor: "background.default",
                                p: 2,
                                borderRadius: 2,
                              }}
                            >
                              <Grid container spacing={3} alignItems="center">
                                <Grid item xs={12} md={4}>
                                  <Box sx={{ textAlign: "center" }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      Expected Selling Price
                                    </Typography>
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                      ${variety.expectedSellingPrice.toFixed(2)}
                                    </Typography>
                                    {variety.priceDescription && (
                                      <Tooltip
                                        title={variety.priceDescription}
                                        arrow
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 0.5,
                                            color: "info.main",
                                            cursor: "help",
                                            mt: 0.5,
                                          }}
                                        >
                                          <InfoIcon fontSize="small" /> Price
                                          Details
                                        </Typography>
                                      </Tooltip>
                                    )}
                                  </Box>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                  <Box sx={{ textAlign: "center" }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      Best Possible Price
                                    </Typography>
                                    <Typography
                                      variant="h5"
                                      sx={{
                                        mt: 1,
                                        color: "success.main",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      $
                                      {variety.bestSellingTime.price.toFixed(2)}
                                    </Typography>
                                  </Box>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                  <Box sx={{ textAlign: "center" }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      display="block"
                                    >
                                      Potential Revenue Increase
                                    </Typography>
                                    <Typography
                                      variant="h5"
                                      sx={{
                                        mt: 1,
                                        color:
                                          priceDifference > 0
                                            ? "success.main"
                                            : priceDifference < 0
                                              ? "error.main"
                                              : "text.primary",
                                      }}
                                    >
                                      {priceDifference > 0 ? "+" : ""}
                                      {priceDifference.toFixed(2)}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      per unit (
                                      {potentialIncrease > 0 ? "+" : ""}$
                                      {potentialIncrease.toFixed(2)} per 100
                                      units)
                                    </Typography>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Box>

                            {/* Recommendation Section */}
                            {/* {priceDifference > 0 && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.light', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon sx={{ color: 'warning.main' }} />
                      <Typography variant="body2">
                        Consider adjusting your selling time to {variety.bestSellingTime.season} {variety.bestSellingTime.year} 
                        to gain an additional ${priceDifference.toFixed(2)} per unit.
                      </Typography>
                    </Box>
                  </Box>
                )} */}

                            {priceDifference <= 0 && (
                              <Box
                                sx={{
                                  mt: 2,
                                  p: 2,
                                  backgroundColor: "success.light",
                                  borderRadius: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <CheckCircleIcon
                                    sx={{ color: "success.main" }}
                                  />
                                  <Typography variant="body2">
                                    Your current selling period is already
                                    optimal for maximizing revenue.
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {/* Optional Summary Stats */}
                  <Paper sx={{ mt: 3, p: 2, backgroundColor: "primary.light" }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Typography
                          variant="subtitle1"
                          color="primary.contrastText"
                          textAlign="center"
                        >
                          Total Varieties: {planningData.length}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography
                          variant="subtitle1"
                          color="primary.contrastText"
                          textAlign="center"
                        >
                          Average Potential Gain: $
                          {(
                            planningData.reduce(
                              (sum, v) =>
                                sum +
                                (v.bestSellingTime.price -
                                  v.expectedSellingPrice),
                              0,
                            ) / planningData.length
                          ).toFixed(2)}{" "}
                          per unit
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography
                          variant="subtitle1"
                          color="primary.contrastText"
                          textAlign="center"
                        >
                          Total Potential Revenue: $
                          {planningData
                            .reduce(
                              (sum, v) =>
                                sum +
                                (v.bestSellingTime.price -
                                  v.expectedSellingPrice) *
                                  100,
                              0,
                            )
                            .toFixed(2)}{" "}
                          per 100 units
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </CardContent>
              </Card>
            )}

            {/* <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
              Recommendations
            </Typography>
            
            <Paper sx={{ p: 3, mb: 4 }}>
              {planningData.map((variety, index) => {
                const bestSellingDate = variety.bestSellingTime.date ? new Date(variety.bestSellingTime.date) : null;
                const sellingStartDate = new Date(variety.sellingStartDate);
                const sellingEndDate = new Date(variety.sellingEndDate);
                let recommendation = '';
                
                if (bestSellingDate) {
                  // Check if best selling date overlaps with selling period
                  if (bestSellingDate >= sellingStartDate && bestSellingDate <= sellingEndDate) {
                    recommendation = `Your selling period includes the best price point on ${format(bestSellingDate, 'MMM dd, yyyy')} ($${variety.bestSellingTime.price}).`;
                  } else if (bestSellingDate < sellingStartDate) {
                    const daysDiff = Math.round((sellingStartDate - bestSellingDate) / (1000 * 60 * 60 * 24));
                    recommendation = `Consider selling ${daysDiff} days earlier to catch the best price point ($${variety.bestSellingTime.price}) on ${format(bestSellingDate, 'MMM dd, yyyy')}.`;
                  } else {
                    const daysDiff = Math.round((bestSellingDate - sellingEndDate) / (1000 * 60 * 60 * 24));
                    recommendation = `Consider selling ${daysDiff} days later to catch the best price point ($${variety.bestSellingTime.price}) on ${format(bestSellingDate, 'MMM dd, yyyy')}.`;
                  }
                }
                
                return (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {variety.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {recommendation}
                    </Typography>
                    {index < planningData.length - 1 && <Divider sx={{ my: 2 }} />}
                  </Box>
                );
              })}
            </Paper> */}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default HarvestPlanningChart;
