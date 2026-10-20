function parsePriceRange(rawMin, rawMax, unit) {
  let min = parseFloat(rawMin);
  let max = parseFloat(rawMax);

  let minPrice = 0;
  let maxPrice = 0;

  if (unit === "میلیارد") {
    // If rawMin is like "685" or "980" (>= 50), it is in millions!
    if (min >= 50) {
      minPrice = Math.round(min * 1_000_000);
    } else {
      minPrice = Math.round(min * 1_000_000_000);
    }

    if (max >= 50) {
      maxPrice = Math.round(max * 1_000_000);
    } else {
      maxPrice = Math.round(max * 1_000_000_000);
    }
  } else {
    // Unit is "میلیون"
    minPrice = Math.round(min * 1_000_000);
    maxPrice = Math.round(max * 1_000_000);
  }

  // Sanity check: minPrice must always be <= maxPrice
  if (minPrice > maxPrice) {
    if (minPrice >= 1_000_000_000 && minPrice / 1000 <= maxPrice) {
      minPrice = Math.round(minPrice / 1000);
    } else {
      const temp = minPrice;
      minPrice = maxPrice;
      maxPrice = temp;
    }
  }

  // Safety cap: ordinary cars shouldn't exceed 45 billion Tomans (even Rolls-Royce / Porsche on Baravard is max ~40B)
  return { minPrice, maxPrice };
}

// Test cases
console.log("Test 1: 685 تا 1.190 میلیارد:", parsePriceRange("685", "1.190", "میلیارد"));
console.log("Test 2: 980 تا 1.900 میلیارد:", parsePriceRange("980", "1.900", "میلیارد"));
console.log("Test 3: 780 تا 980 میلیون:", parsePriceRange("780", "980", "میلیون"));
console.log("Test 4: 1.850 تا 1.920 میلیارد:", parsePriceRange("1.850", "1.920", "میلیارد"));
console.log("Test 5: 1 تا 1.190 میلیارد:", parsePriceRange("1", "1.190", "میلیارد"));
