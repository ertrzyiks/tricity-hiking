# Public Transportation Review Guide

This document lists all public transportation references in the route MDX files that need verification.

## Important Note for Reviewers

Please verify the following information against current ZTM Gdańsk schedules and route maps:
- Official ZTM website: https://www.ztm.gda.pl/
- Route planner: https://jakdojade.pl/gdansk/
- Google Maps public transit

## Routes with Transportation Information

### 1. Leśnik to Opera Leśna (lesnik-opera.mdx)

**Current information:**
- Bus 117 from _Sopot Sikorskiego_ to _Sopot Sanatorium "Leśnik"_

**To verify:**
- [ ] Is bus line 117 still operating?
- [ ] Does it still stop at Sopot Sikorskiego?
- [ ] Does it still go to Sopot Sanatorium "Leśnik"?
- [ ] Is the stop name still current?

### 2. Wąwóz Huzarów (wawoz-huzarow.mdx)

**Current information:**
- Bus 157 to _Potokowa_ stop (10 min walk to start)
- PKM train to _Gdańsk Niedźwiednik_ station (20 min walk to start)

**To verify:**
- [ ] Is bus line 157 still operating?
- [ ] Does it stop at Potokowa?
- [ ] Is _Gdańsk Niedźwiednik_ PKM station still operating?
- [ ] Are walking times accurate?

### 3. Sobieszewo (sobieszewo.mdx)

**Current information:**
- Bus lines 112, 186 to Sobieszewo
- Bus 112 to _Gdańsk Lazurowa_ stop
- Frequency: "roughly every 40 minutes"

**To verify:**
- [ ] Are bus lines 112 and 186 still operating to Sobieszewo?
- [ ] Does bus 112 stop at _Gdańsk Lazurowa_?
- [ ] What is the current frequency of bus 112? (especially check seasonal variations)
- [ ] Is there a lifting bridge schedule that should be mentioned?

### 4. Dolina Elfów (dolina-elfow.mdx)

**Current information:**
- SKM train to _Gdańsk Przymorze-Uniwersytet_ (start)
- SKM train from _Gdańsk Oliwa_ (end)

**To verify:**
- [ ] Are both SKM stations operational?
- [ ] Are station names current?

### 5. Sopot Wyścigi to Kamienny Potok (sopot-wyscigi-to-kamienny-potok.mdx)

**Current information:**
- SKM train to _Sopot Wyścigi_ (start)
- SKM train from _Sopot Kamienny Potok_ (end)

**To verify:**
- [ ] Are both SKM stations operational?
- [ ] Are station names current?

### 6. Dolina Radości (dolina-radosci.mdx)

**Current information:**
- Bus stop _Karwieńska_ (40 min walk to start)
- Note: Car recommended due to poor public transport access

**To verify:**
- [ ] Does bus stop _Karwieńska_ exist?
- [ ] Which bus lines serve this stop?
- [ ] Is the walking time accurate?
- [ ] Are there any new/better public transport options?

### 7. Góra Markowca (gora-markowca.mdx)

**Current information:**
- SKM train to Rumia (20 min walk to start)

**To verify:**
- [ ] Is SKM to Rumia operational?
- [ ] Is the walking time accurate?
- [ ] Are there any bus options from Rumia station?

### 8. Dolina Strzyży (dolina-strzyzy.mdx)

**Current information:**
- PKM train from _Gdańsk Wrzeszcz_ to _Gdańsk Brętowo_ (10 min walk)
- Bus 227 to _Gdańsk Brętowo_ station
- Bus 116 to _Karskiego_ stop (closest by bus)

**To verify:**
- [ ] Is PKM route _Gdańsk Wrzeszcz_ to _Gdańsk Brętowo_ operational?
- [ ] Does bus 227 stop at _Gdańsk Brętowo_?
- [ ] Does bus 116 stop at _Karskiego_?
- [ ] Are these still the best bus options?
- [ ] Are walking times accurate?

### 9. Samborowo to Głowica (samborowo-glowica.mdx)

**Current information:**
- Bus 149 or 249 to _Norblina_ stop
- Alternative: train or tram to _Strzyża PKM_ stop (10 min extra walk)

**To verify:**
- [ ] Are bus lines 149 and 249 still operating?
- [ ] Do they stop at _Norblina_?
- [ ] Which tram line goes to _Strzyża PKM_?
- [ ] Is _Strzyża PKM_ accessible by train?
- [ ] Are walking times accurate?

**Issue:** Tram line number is not specified - should be added if this option is available.

### 10. Orłowo to Bulwar (orlowo-bulwar.mdx)

**Current information:**
- Train to _Gdynia Orłowo_ (20 min walk to pier)
- _Gdynia Redłowo_ train stop (intermediate option)
- _Gdynia Wzgórze Św. Maksymiliana_ (end point)
- Bus stop near artillery battery

**To verify:**
- [ ] Are all three train stations operational?
- [ ] Are station names current?
- [ ] Which bus line stops near the artillery battery?
- [ ] Are walking times accurate?

**Issue:** Bus line number near artillery battery is not specified - should be identified and added.

## Summary of Lines to Verify

### Bus Lines
- 112 (to Sobieszewo/Lazurowa)
- 116 (to Karskiego)
- 117 (Sopot Sikorskiego to Leśnik)
- 149 (to Norblina)
- 157 (to Potokowa)
- 186 (to Sobieszewo)
- 227 (to Brętowo)
- 249 (to Norblina)
- Unspecified line at _Karwieńska_ stop
- Unspecified line near artillery battery in Gdynia
- Unspecified tram line to _Strzyża PKM_

### Train Stations (SKM)
- Gdańsk Przymorze-Uniwersytet
- Gdańsk Oliwa
- Sopot Wyścigi
- Sopot Kamienny Potok
- Rumia

### Train Stations (PKM)
- Gdańsk Niedźwiednik
- Gdańsk Wrzeszcz
- Gdańsk Brętowo
- Strzyża PKM

### Train Stations (Unspecified Network)
- Gdynia Orłowo
- Gdynia Redłowo
- Gdynia Wzgórze Św. Maksymiliana

## Recommendations

1. **Add verification dates**: Include a "Last verified: YYYY-MM-DD" field in each route's frontmatter
2. **Link to official resources**: Add links to ZTM journey planner or official schedules
3. **Seasonal variations**: Note if bus frequencies differ in summer vs winter
4. **Missing information**: Add specific tram and bus line numbers where missing
5. **Accessibility**: Consider adding accessibility information for each station/stop
6. **Real-time updates**: Consider adding links to real-time departure information

## How to Update

After verification, update the corresponding MDX files in `src/content/routes/[route-name]/[route-name].mdx` with any changes to:
- Bus/tram line numbers
- Stop names
- Station names
- Frequencies
- Walking times
- Alternative routes

Consider adding a standard format for transportation information, such as:

```markdown
## Public Transportation

**Last verified:** 2025-01-15

### By Train
- **SKM**: Get off at _Station Name_
- **Walking time**: X minutes from station
- **Frequency**: Check [SKM schedule](link)

### By Bus
- **Line XXX**: Get off at _Stop Name_
- **Walking time**: X minutes from stop
- **Frequency**: Every X minutes (peak) / X minutes (off-peak)
- **Check schedule**: [ZTM route planner](link)
```

## Contact

For questions about this review, please contact the repository maintainer.
