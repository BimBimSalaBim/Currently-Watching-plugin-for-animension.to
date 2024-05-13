

// Your existing code handles UI updates and interacts with the stored anime list
if (document.readyState === "complete" || document.readyState === "interactive") {
    mainInitializationFunction();
} else {
    document.addEventListener('DOMContentLoaded', mainInitializationFunction);
}
//when document is changed or updated inject icons
document.addEventListener('DOMNodeInserted', function(event) {
    injectAddIcons();
});

function mainInitializationFunction() {
    console.log('Document is ready.');
    loadFontAwesome();
    injectAnimeListSection();
    setTimeout(() => {
        injectAddIcons();
    }, 300);
    loadAnimeList();
}
function loadFontAwesome() {
    const link = document.createElement('link');
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
}

function injectAddIcons() {
    // Get the current list of animes from storage
    chrome.storage.local.get(['animeList'], function(result) {
        const storedAnimeList = result.animeList || [];
        const animeItems = document.querySelectorAll('.bsx');

        animeItems.forEach(item => {
            const titleElement = item.querySelector('.tt');
            const animeTitle = titleElement ? titleElement.textContent.trim() : '';
            const animeLink = item.querySelector('a') ? item.querySelector('a').href : '#';
            const images = item.querySelectorAll('img');
            const animeImg = images && images.length > 1 ? images[1].src : ''; // Get the second image

            // Check if the anime is already in the list
            if (!storedAnimeList.some(anime => anime.title === animeTitle)) {
                // Only add the icon if the anime is not already in the list
                if (!item.querySelector('.add-icon')) {
                    const addIcon = document.createElement('i');
                    addIcon.className = 'fas fa-plus-circle add-icon';
                    addIcon.style.cursor = 'pointer';
                    addIcon.style.marginLeft = '10px';
                    addIcon.style.color = '#2387bd'; // Custom color

                    if (titleElement) {
                        item.appendChild(addIcon);
                    }

                    addIcon.addEventListener('click', function(event) {
                        event.stopPropagation(); // Prevent the link from navigating
                        addAnime(animeTitle, animeImg, animeLink);
                    });
                }
            }
        });
    });
}

function getAnimeIdFromUrl(url) {
    const urlParts = url.split('/');
    console.log(urlParts[urlParts.length - 1]);
    return urlParts[urlParts.length - 1];
}
function addAnime(animeTitle, animeImg, animeLink, lastWatched = 0, newestEpisode = 0) {
    chrome.storage.local.get(['animeList'], function(result) {
        let animeList = result.animeList || [];
        let animeData = {
            title: animeTitle,
            animeId: getAnimeIdFromUrl(animeLink),
            img: animeImg,
            link: animeLink,
            newEpisodes: 0,
            lastWatchedEpisode: lastWatched,
            newestEpisode: newestEpisode
        };
        if (!animeList.some(anime => anime.title === animeTitle)) {
            animeList.push(animeData);
            chrome.storage.local.set({animeList: animeList}, function() {
                console.log(animeTitle + ' added to your list');
                loadAnimeList(); // Reload the list to reflect changes
            });
        } else {
            console.log(animeTitle + ' is already in your list');
        }
    });
}



function injectAnimeListSection() {
    const sidebar = document.getElementById('sidebar'); // Get the sidebar element
    if (sidebar) {
        const animeSection = document.createElement('div');
        animeSection.className = 'section';
        animeSection.innerHTML = `
            <div class="releases">
                <h3>Currently Watching</h3>
            </div>
            <div class="serieslist">
                <ul id="animeList"></ul>

            </div>
        `;
        sidebar.insertBefore(animeSection, sidebar.firstChild); // Insert at the top of the sidebar

        // document.getElementById('addAnime').addEventListener('click', function() {
        //     const newAnime = document.getElementById('newAnime').value.trim();
        //     if (newAnime) {
        //         addAnime(newAnime);
        //     }
        // });
    }
}

function loadAnimeList() {
    chrome.storage.local.get('animeList', function(result) {
        console.log('Anime list:', result.animeList);
        const animeList = result.animeList || [];
        const listElement = document.getElementById('animeList');
        if (listElement) {
            listElement.innerHTML = ''; // Clear existing list items
            animeList.forEach((anime, index) => {
                const li = document.createElement('li');
                li.className = 'limit';
                li.draggable = true; // Make the list item draggable
                li.setAttribute('data-index', index);
                li.addEventListener('dragstart', handleDragStart);
                li.addEventListener('dragover', handleDragOver);
                li.addEventListener('drop', handleDrop);
                li.addEventListener('dragend', handleDragEnd);

                // Image container
                const imgseriesDiv = document.createElement('div');
                imgseriesDiv.className = 'imgseries';
                const aImg = document.createElement('a');
                aImg.className = 'series';
                aImg.href = anime.link;
                const img = document.createElement('img');
                img.src = anime.img;
                img.style.width = '50px'; // Set image size
                aImg.appendChild(img);
                imgseriesDiv.appendChild(aImg);
                li.appendChild(imgseriesDiv);

                // Title link container
                const titleLinkDiv = document.createElement('div');
                titleLinkDiv.className = 'leftseries';
                const h4 = document.createElement('h4');
                const aTitle = document.createElement('a');
                aTitle.className = 'series';
                aTitle.href = anime.link;
                aTitle.textContent = anime.title;
                h4.appendChild(aTitle);
                titleLinkDiv.appendChild(h4);

                // Check for new episodes and add notification
                if (anime.newEpisodes > 0) {
                    const newEpisodeNotification = document.createElement('span');
                    newEpisodeNotification.textContent = 'New Episode!';
                    newEpisodeNotification.style.color = 'red'; // Style as needed
                    titleLinkDiv.appendChild(newEpisodeNotification);
                }

                li.appendChild(titleLinkDiv);

                // Remove button
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.className = 'remove-btn';
                removeBtn.onclick = function() { removeAnime(index); };
                li.appendChild(removeBtn);

                listElement.appendChild(li);
            });
        }
    });
}


let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedItem !== this) {
        swapItems(draggedItem, this);
        updateStorageOrder(draggedItem.dataset.index, this.dataset.index);
    }
}

function handleDragEnd(e) {
    // Update styles or cleanup if necessary
}

function swapItems(fromItem, toItem) {
    let temp = document.createElement("div");
    temp.innerHTML = fromItem.outerHTML;
    fromItem.outerHTML = toItem.outerHTML;
    toItem.outerHTML = temp.innerHTML;
}

function updateStorageOrder(fromIndex, toIndex) {
    chrome.storage.local.get('animeList', function(result) {
        let animeList = result.animeList || [];
        const movedItem = animeList.splice(fromIndex, 1)[0]; // Remove and get the item
        animeList.splice(toIndex, 0, movedItem); // Insert item at new position
        chrome.storage.local.set({animeList: animeList}, () => {
            console.log('Anime list reordered.');
            loadAnimeList(); // Optionally reload the list
        });
    });
}



function removeAnime(index) {
    chrome.storage.local.get(['animeList'], function(result) {
        let animeList = result.animeList || [];
        animeList.splice(index, 1);
        chrome.storage.local.set({animeList: animeList}, function() {
            loadAnimeList(); // Reload the list to reflect changes
        });
    });
}


// Add this within your mainInitializationFunction or top-level code
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'newEpisodes') {
        console.log('Received new episodes for anime ID:', message.animeId, message.episodes);
        // Update the sidebar UI here
        updateSidebarWithNewEpisodes(message.animeId, message.episodes);
    }
});

function updateSidebarWithNewEpisodes(animeId, episodes) {
    // Implement functionality to update the sidebar with new episode information
    console.log('Update the sidebar for Anime ID ' + animeId + ' with:', episodes);
}
