# ==============================================================================
# BMTC Smart Bus Crowd Prediction System - Analytics & Statistical Modeling
# Language: R Programming
# Filename: smart_bus_analysis.R
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. DATA PREPARATION (Realistic BMTC Transit Log Dataset)
# ------------------------------------------------------------------------------
# Creating a high-fidelity dataset representing real-time telemetry from 30 recent 
# bus station stops across the 5 active BMTC routes in our system.
#
# Variables:
#   - Route_ID: Unique identifier for the BMTC route
#   - Bus_No: BMTC vehicle registration code
#   - Station: Current stop name
#   - Occupancy: Number of passengers inside the bus after stop boarding/alighting
#   - Boarding_Count: Number of passengers who got in (Door Sensor UP line)
#   - Alighting_Count: Number of passengers who got out (Door Sensor DOWN line)
#   - Crowd_Load_Pct: Real-time station load forecast percentage (ML Model)
#   - Capacity_Index_Pct: Bus capacity utilization percentage (Max capacity = 40)

bmtc_transit_data <- data.frame(
  Route_ID = factor(c(
    "R-500D", "R-500D", "R-500D", "R-500D", "R-500D", "R-500D",
    "R-335E", "R-335E", "R-335E", "R-335E",
    "R-201", "R-201", "R-201", "R-201", "R-201", "R-201",
    "R-G3", "R-G3", "R-G3", "R-G3", "R-G3",
    "R-360G", "R-360G", "R-360G", "R-360G", "R-360G", "R-360G",
    "R-500D", "R-335E", "R-201"
  )),
  Bus_No = factor(c(
    "KA-57-F-0145", "KA-57-F-0145", "KA-57-F-0145", "KA-57-F-0145", "KA-57-F-0145", "KA-57-F-0145",
    "KA-57-F-0888", "KA-57-F-0888", "KA-57-F-0888", "KA-57-F-0888",
    "KA-57-F-0201", "KA-57-F-0201", "KA-57-F-0201", "KA-57-F-0201", "KA-57-F-0201", "KA-57-F-0201",
    "KA-57-F-0303", "KA-57-F-0303", "KA-57-F-0303", "KA-57-F-0303", "KA-57-F-0303",
    "KA-57-F-3601", "KA-57-F-3601", "KA-57-F-3601", "KA-57-F-3601", "KA-57-F-3601", "KA-57-F-3601",
    "KA-57-F-1209", "KA-57-F-0888", "KA-57-F-0202"
  )),
  Station = c(
    "Hebbal", "Tin Factory", "Marathahalli", "Bellandur", "Agara", "Central Silk Board",
    "Majestic", "Corporation", "Domlur", "Kadugodi",
    "Srinagar", "Banashankari", "Jayanagar", "Dairy Circle", "Koramangala", "Domlur",
    "Majestic", "Richmond Circle", "Shanthi Nagar", "Hosur Road", "HSR Layout",
    "Majestic", "Shanthi Nagar", "Dairy Circle", "Silk Board", "Kudlu Gate", "Electronic City",
    "Tin Factory", "Corporation", "Banashankari"
  ),
  Occupancy = c(
    15, 28, 36, 25, 20, 10,
    12, 26, 22, 5,
    8, 24, 22, 18, 32, 6,
    14, 20, 30, 22, 8,
    18, 28, 25, 38, 20, 6,
    16, 31, 15
  ),
  Boarding_Count = c(
    15, 18, 22, 5, 2, 0,
    12, 16, 4, 0,
    8, 20, 6, 2, 18, 0,
    14, 8, 15, 2, 0,
    18, 14, 5, 24, 2, 0,
    9, 19, 11
  ),
  Alighting_Count = c(
    0, 5, 14, 16, 7, 10,
    0, 2, 8, 17,
    0, 4, 8, 6, 4, 26,
    0, 2, 5, 10, 14,
    0, 4, 8, 11, 7, 14,
    3, 6, 4
  ),
  Crowd_Load_Pct = c(
    15, 65, 90, 45, 30, 10,
    10, 70, 40, 12,
    12, 75, 50, 45, 85, 8,
    15, 38, 70, 45, 12,
    18, 65, 42, 88, 35, 10,
    65, 70, 75
  )
)

# Dynamically compute Capacity Index Percentage (Occupancy / Max Capacity 40 * 100)
bmtc_transit_data$Capacity_Index_Pct <- (bmtc_transit_data$Occupancy / 40) * 100

# ------------------------------------------------------------------------------
# 2. FILE OUTPUT CONFIGURATION (sink to analysis_output.txt)
# ------------------------------------------------------------------------------
output_file <- "analysis_output.txt"
sink(output_file)

cat("======================================================================\n")
cat("          BMTC SMART BUS CROWD PREDICTION - ANALYSIS REPORT\n")
cat("======================================================================\n")
cat("Timestamp of Execution:", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), "\n\n")

# ------------------------------------------------------------------------------
# 3. SUMMARY STATISTICS
# ------------------------------------------------------------------------------
cat("----------------------------------------------------------------------\n")
cat("1. DATASET OVERVIEW & SUMMARY STATISTICS\n")
cat("----------------------------------------------------------------------\n")
print(summary(bmtc_transit_data[, c("Occupancy", "Boarding_Count", "Alighting_Count", "Crowd_Load_Pct", "Capacity_Index_Pct")]))
cat("\n")

# Detailed metrics for individual parameters
numeric_cols <- c("Occupancy", "Boarding_Count", "Alighting_Count", "Crowd_Load_Pct")
for (col in numeric_cols) {
  val <- bmtc_transit_data[[col]]
  cat("Variable [", col, "]:\n", sep="")
  cat("  - Minimum          :", min(val), "\n")
  cat("  - 1st Quartile (Q1):", quantile(val, 0.25), "\n")
  cat("  - Median (Q2)      :", median(val), "\n")
  cat("  - Mean             :", round(mean(val), 2), "\n")
  cat("  - 3rd Quartile (Q3):", quantile(val, 0.75), "\n")
  cat("  - Maximum          :", max(val), "\n")
  cat("  - Std Deviation    :", round(sd(val), 2), "\n")
  cat("  - Interquartile Rng:", IQR(val), "\n\n")
}

# ------------------------------------------------------------------------------
# 4. CORRELATION ANALYSIS
# ------------------------------------------------------------------------------
cat("----------------------------------------------------------------------\n")
cat("2. CORRELATION MATRIX BETWEEN SENSOR PARAMETERS\n")
cat("----------------------------------------------------------------------\n")
cor_matrix <- cor(bmtc_transit_data[, numeric_cols])
print(round(cor_matrix, 4))
cat("\n")
cat("Key Interpretations:\n")
cat("  - Correlation between Station Crowd Load % and Boarding Count:", 
    round(cor(bmtc_transit_data$Crowd_Load_Pct, bmtc_transit_data$Boarding_Count), 4), 
    "(Strong positive relation; full stations lead to high boardings)\n")
cat("  - Correlation between Station Crowd Load % and Occupancy:", 
    round(cor(bmtc_transit_data$Crowd_Load_Pct, bmtc_transit_data$Occupancy), 4), 
    "(Positive relation; indicates high occupancy on routes crossing surge nodes)\n")
cat("\n")

# Close console redirection
sink()
cat("Analysis text output successfully saved to [", output_file, "]\n", sep="")

# ------------------------------------------------------------------------------
# 5. VISUALIZATIONS GENERATION (Saving PNG plots)
# ------------------------------------------------------------------------------
cat("Generating visualization plots...\n")

# Plot 1: Occupancy Histogram
png("occupancy_histogram.png", width=800, height=600, res=100)
hist(bmtc_transit_data$Occupancy, 
     main="Distribution of Bus Passenger Occupancy", 
     xlab="Passenger Count (Occupancy)", 
     ylab="Frequency (Stop Count)", 
     col="#3b82f6", 
     border="#0f172a", 
     breaks=10)
abline(v=mean(bmtc_transit_data$Occupancy), col="red", lwd=2, lty=2)
legend("topright", legend=c("Mean Occupancy"), col=c("red"), lty=2, lwd=2)
dev.off()

# Plot 2: Scatter Plot - Crowd Load Pct vs Occupancy
png("crowd_vs_occupancy.png", width=800, height=600, res=100)
plot(bmtc_transit_data$Crowd_Load_Pct, bmtc_transit_data$Occupancy,
     main="Station Crowd Surge vs. Bus Passenger Occupancy",
     xlab="Station Crowd Load Forecast (%)",
     ylab="Live Bus Occupancy Count",
     pch=19,
     col="#10b981",
     grid())
# Add trendline
abline(lm(Occupancy ~ Crowd_Load_Pct, data=bmtc_transit_data), col="#ef4444", lwd=2)
dev.off()

# Plot 3: Boxplot of Occupancy by Route
png("route_occupancy_boxplot.png", width=800, height=600, res=100)
boxplot(Occupancy ~ Route_ID, data=bmtc_transit_data,
        main="Bus Occupancy Range across BMTC Routes",
        xlab="Route ID",
        ylab="Passenger Occupancy",
        col=c("#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ec4899"),
        border="#1e293b")
dev.off()

# Plot 4: Pair Plots (THE PRIMARY VISUALIZATION REQUESTED)
# This evaluates general correlations and scatter matrices between all parameters.
png("pair_plot.png", width=1000, height=1000, res=120)
pairs(bmtc_transit_data[, numeric_cols],
      main="Scatter Plot Matrix (Pairs Plot) of Smart Bus Telemetry Data",
      col=rgb(59/255, 130/255, 246/255, 0.7),
      pch=19,
      cex=1.5,
      oma=c(3,3,5,3))
dev.off()

cat("Plots generated successfully:\n")
cat("  - occupancy_histogram.png\n")
cat("  - crowd_vs_occupancy.png\n")
cat("  - route_occupancy_boxplot.png\n")
cat("  - pair_plot.png (Evaluation Scatter Matrix)\n")
cat("======================================================================\n")

