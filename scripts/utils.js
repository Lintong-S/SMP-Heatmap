let my_utils = {};

my_utils.fetchLastFmData = function(apiKey, username, year, month) {
  return new Promise((resolve) => {
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);
    const from = Math.floor(fromDate.getTime() / 1000);
    const to = Math.floor(toDate.getTime() / 1000);
    
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getWeeklyTrackChart&user=${username}&api_key=${apiKey}&from=${from}&to=${to}&format=json`;
    
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function() {
      if (request.readyState === 4 && request.status === 200) {
        try {
          const data = JSON.parse(request.responseText);
          const plays = {};
          
          if (data.weeklytrackchart?.track) {
            const tracks = Array.isArray(data.weeklytrackchart.track) 
              ? data.weeklytrackchart.track 
              : [data.weeklytrackchart.track];
            
            tracks.forEach(track => {
              if (track.date?.uts) {
                const playDate = new Date(parseInt(track.date.uts) * 1000);
                const dateStr = `${playDate.getFullYear()}-${(playDate.getMonth()+1).toString().padStart(2,'0')}-${playDate.getDate().toString().padStart(2,'0')}`;
                plays[dateStr] = (plays[dateStr] || 0) + 1;
              }
            });
          }
          resolve(plays);
        } catch (e) {
          console.log("Last.fm parse error:", e);
          resolve({});
        }
      }
    };
    request.send();
  });
};
