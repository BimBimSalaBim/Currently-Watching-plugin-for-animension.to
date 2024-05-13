// Fetches episodes from the API and stores them
function fetchAndStoreEpisodes(animeId) {
    const url = `https://animension.to/public-api/episodes_2.php?id=${animeId}`;
    fetch(url)
        .then(response => response.json())
        .then(episodes => {
            chrome.storage.local.set({[`episodes_${animeId}`]: episodes}, () => {
                // console.log('Episodes for ' + animeId + ' stored successfully', episodes);
            });
        })
        .catch(error => console.error('Failed to fetch episodes for anime ID ' + animeId + ':', error));
}

// Fetches watch history and stores it
function fetchAndStoreHistory() {
    const url = 'https://animension.to/public-api/history_last_30.php';
    fetch(url)
        .then(response => response.json())
        .then(history => {
            const normalizedHistory = normalizeHistory(history);
            chrome.storage.local.set({watchHistory: normalizedHistory}, () => {
                console.log('Watch history stored successfully');
            });
        })
        .catch(error => console.error('Failed to fetch watch history:', error));
}

// Normalize history data to ensure consistency
function normalizeHistory(historyItems) {
    return historyItems.map(item => {
        if (Array.isArray(item)) {
            // console.log("line 31 : ", (item))
            // console.log("line 32 : ", String(item['3']))
            return {animeTitle: item[0], animeId:  String(item[1]), episodeNumber:  String(item[3])};
        } else {
            return {animeTitle: item['0'], animeId:  String(item['1']), episodeNumber:  String(item['3']), altName: item['4']};
        }
    });
}

// Check for new episodes based on stored episodes and watch history
function checkForNewEpisodes(animeId) {
    fetchAndStoreHistory(); // Ensure the history is up-to-date
    chrome.storage.local.get(['animeList'], function(result) {
        const animeList = result.animeList || [];

        // Get episodes and history
        chrome.storage.local.get([`episodes_${animeId}`, 'watchHistory'], function(data) {
            const episodes = data[`episodes_${animeId}`];
            if (!episodes) {
                console.error('No episodes data found for Anime ID:', animeId);
                return; // Exit if no episodes data
            }

            const history = data.watchHistory || [];
            const lastWatchedEpisode = findLastWatchedEpisode(history, animeId);

            console.log(`Processing Anime ID ${animeId}: Last watched episode ${lastWatchedEpisode}`);
            
            const newEpisodes = episodes.filter(ep => ep[2] > lastWatchedEpisode);
            console.log(`New episodes for Anime ID ${animeId}:`, newEpisodes);

            // Find the anime in the animeList and update its newEpisodes count
            const index = animeList.findIndex(anime => anime.animeId === animeId);
            if (index !== -1) {
                animeList[index].lastWatchedEpisode = lastWatchedEpisode;
                if (animeList[index].newEpisodes !== newEpisodes.length) {
                    animeList[index].newEpisodes = newEpisodes.length; // Only update if different
                    chrome.storage.local.set({animeList: animeList}, () => {
                        console.log(`Updated anime list with new episodes count for ${animeId}`);
                    });
                } else {
                    console.log(`No update needed for ${animeId} (no new episodes)`);
                }
            } else {
                console.log('Anime ID not found in the animeList:', animeId);
            }
        });
    });
}

function findLastWatchedEpisode(history, animeId) {
    let maxEpisode = 0;
    history.forEach(item => {
        // console.log(Object.values(item.animeId).join('')," Line 82")
        let currentAnimeId = Object.values(item.animeId).join('');
        // console.log(currentAnimeId," Line 84 : " , item.episodeNumber)
        let episodeNumber = parseInt(item.episodeNumber);
        // console.log("currentAnimeId",currentAnimeId,"AnimeId",animeId.toString());
        // console.log("episodeNumber: ", episodeNumber, "maxEpisode: ", maxEpisode, "episodeNumber > maxEpisode: ", episodeNumber > maxEpisode  );
        if (currentAnimeId === animeId.toString() && episodeNumber > maxEpisode) {
            maxEpisode = episodeNumber;
        }
    });
    return maxEpisode;
}


function updateAnimeList(animeList, animeId, newEpisodesCount) {
    const index = animeList.findIndex(anime => anime.animeId === animeId);
    if (index !== -1) {
        // Update local copy of anime list
        animeList[index].newEpisodes = newEpisodesCount;


        // Immediately update storage with new data
        chrome.storage.local.set({animeList: animeList}, () => {
            console.log(`Updated anime list with new episodes count for ${animeId}`);
            
        });
        chrome.storage.local.get('animeList', function(result) {
            let animeList = result.animeList || [];
            console.log("current Count: " + newEpisodesCount);
            console.log(animeList[index].newEpisodes);
        });
    } else {
        console.log(`Anime ID ${animeId} not found in the list`);
    }
}


function concatenateValues(dataObject) {
    return Object.values(dataObject).join('');
}


function getAnimeIdFromUrl(url) {
    const urlParts = url.split('/');
    // console.log(urlParts[urlParts.length - 1]);
    return urlParts[urlParts.length - 1];
}

function update(){
    chrome.storage.local.get(['animeList'], function(result) {
        let animeList = result.animeList || [];
        // console.log(animeList);
        for(let i = 0; i < animeList.length; i++){
            fetchAndStoreEpisodes(getAnimeIdFromUrl(animeList[i].animeId) );
            checkForNewEpisodes(getAnimeIdFromUrl(animeList[i].animeId) );
        }
    });
}


function init() {
    // const exampleAnimeId = '2578963147'; // Replace with dynamic or user-selected IDs as needed
    // fetchAndStoreEpisodes(exampleAnimeId);
    
    
    chrome.storage.local.get(['animeList'], function(result) {
        let animeList = result.animeList || [];
        // console.log(animeList);
        for(let i = 0; i < animeList.length; i++){
            fetchAndStoreEpisodes(getAnimeIdFromUrl(animeList[i].animeId) );
            checkForNewEpisodes(getAnimeIdFromUrl(animeList[i].animeId) );
        }
    });
    
    setInterval(() => update(), 600000); 
}

init();
