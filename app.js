let db; // Declare db variable outside of the DOMContentLoaded event

document.addEventListener('DOMContentLoaded', function () {
    // Firebase Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBml0fAdhBOup3f1N5Vw-37zvLci2Ku2ys",
        authDomain: "lane-parking.firebaseapp.com",
        projectId: "lane-parking",
        storageBucket: "lane-parking.appspot.com",
        messagingSenderId: "808256706179",
        appId: "1:808256706179:web:4f81dfca9d9c279774adb6"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    // Check auth state to toggle log-in/log-out buttons and List Yard form
    firebase.auth().onAuthStateChanged(function (user) {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const yardForm = document.getElementById('yard-form');
    const editAccountBtn = document.getElementById('edit-account-btn');  // Add this line
    const editYardBtn = document.getElementById('edit-yard-btn');  // Add this line
        
    if (user) {
        // User is logged in, show log-out button, List Yard form, and Edit buttons
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
    
        if (yardForm) {
            yardForm.style.display = 'block'; // Show the List Yard form
        }
    
        if (editAccountBtn) {
            editAccountBtn.style.display = 'inline-block';  // Show Edit Account button
        }
        if (editYardBtn) {
            editYardBtn.style.display = 'inline-block';  // Show Edit Yard Postings button
        }
            
    } else {
        // User is not logged in, show log-in and sign-up buttons and hide form/buttons
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    
        if (yardForm) {
            yardForm.style.display = 'none'; // Hide the List Yard form
        }
    
        if (editAccountBtn) {
            editAccountBtn.style.display = 'none';  // Hide Edit Account button
        }
        if (editYardBtn) {
            editYardBtn.style.display = 'none';  // Hide Edit Yard Postings button
        }
            // Ensure yard listings are visible when logged out
            displayYardListings();  // Fetch and display yard listings when logged out
        }
    });

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
    
            const firstName = document.getElementById('first-name').value;
            const lastInitial = document.getElementById('last-initial').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            
            // Get selected payment methods and usernames
            const paymentMethods = [];
            const paypalUsername = document.getElementById('paypal-username').value;
            const venmoUsername = document.getElementById('venmo-username').value;
            const zelleUsername = document.getElementById('zelle-username').value;
    
            if (document.getElementById('paypal-checkbox').checked) {
                paymentMethods.push({ method: 'PayPal', username: paypalUsername });
            }
            if (document.getElementById('venmo-checkbox').checked) {
                paymentMethods.push({ method: 'Venmo', username: venmoUsername });
            }
            if (document.getElementById('zelle-checkbox').checked) {
                paymentMethods.push({ method: 'Zelle', username: zelleUsername });
            }
    
            // Save user data including payment methods
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    return db.collection('users').doc(user.uid).set({
                        firstName: firstName,
                        lastInitial: lastInitial,
                        phone: phone,
                        email: email,
                        paymentMethods: paymentMethods
                    });
                })
                .then(() => {
                    alert('Account created successfully.');
                    signupForm.reset();
                    closeModal();
                })
                .catch(error => {
                    console.error('Error during sign up:', error.message);
                });
        });
    }

    // Login Form Submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('Login successful!');
                closeModal();
            })
            .catch(error => {
                alert(error.message);
            });
        });
    }

    
    function populateFilters() {
        db.collection('yards').get().then((querySnapshot) => {
            const listingTypes = new Set();
    
            querySnapshot.forEach((doc) => {
                const yard = doc.data();
                listingTypes.add(yard.listingType);
            });
    
            // Populate listing type filter
            const listingTypeFilter = document.getElementById('listing-type-filter');
            listingTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                listingTypeFilter.appendChild(option);
            });
        }).catch(error => {
            console.error('Error fetching yard data: ', error);
        });
    }
    

    // Ensure populateFilters is called when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        populateFilters();
    });
    
    // Add event listeners for payment method checkboxes
    document.getElementById('paypal-checkbox').addEventListener('change', function() {
        document.getElementById('paypal-username').style.display = this.checked ? 'block' : 'none';
    });
    document.getElementById('venmo-checkbox').addEventListener('change', function() {
        document.getElementById('venmo-username').style.display = this.checked ? 'block' : 'none';
    });
    document.getElementById('zelle-checkbox').addEventListener('change', function() {
        document.getElementById('zelle-username').style.display = this.checked ? 'block' : 'none';
    });

    // Fetch and display yard listings on the Browse Yards page
    const yardListingsDiv = document.getElementById('yard-listings');
    if (yardListingsDiv) {
        displayYardListings(); // Call the function to display yard listings
    }

    // Filtering functionality for Browse Yards
    const filterForm = document.getElementById('yard-filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const location = document.getElementById('location-filter').value.toLowerCase();
            const maxPrice = parseFloat(document.getElementById('price-filter').value);
            const listingType = document.getElementById('listing-type-filter').value;
            const availabilityDate = document.getElementById('availability-filter').value;
            const spots = parseInt(document.getElementById('spots-filter').value);
            displayFilteredYardListings(location, maxPrice, listingType, availabilityDate, spots);
        });
    }
    
    // Function to display filtered yard listings
    function displayFilteredYardListings(location, maxPrice, listingType, availabilityDate) {
        db.collection('yards').get().then((querySnapshot) => {
            const yardListingsDiv = document.getElementById('yard-listings');
            yardListingsDiv.innerHTML = ''; // Clear previous listings

            querySnapshot.forEach((doc) => {
                const yard = doc.data();

                // Convert address to lowercase for comparison
                const yardAddress = yard.address.toLowerCase();
                const yardPrice = parseFloat(yard.price);

                // Apply filters
                const matchesLocation = location === '' || yardAddress.includes(location);
                const matchesPrice = isNaN(maxPrice) || yardPrice <= maxPrice;
                const matchesType = listingType === '' || yard.listingType === listingType;
                const matchesSpots = isNaN(spots) || yard.spots >= spots;  // Filter by number of spots
                const matchesAvailability = availabilityDate === '' || yard.eventDate === availabilityDate;
    
    
                    if (
                        matchesLocation && 
                        matchesPrice && 
                        matchesType && 
                        matchesAvailability
                    ) {
                        const yardDiv = document.createElement('div');
                        yardDiv.classList.add('yard-listing');
                        yardDiv.innerHTML = `
                            <h3>Address: ${yard.address}</h3>
                            <p>Price: $${yard.price} per event</p>
                            <p>Availability: ${yard.startTime} - ${yard.endTime}</p>
                            <p>Type: ${yard.listingType}</p>
                            <p>Notes: ${yard.listingNote || 'No additional notes'}</p>
                            <button onclick="openReservationModal('${yardId}')" class="reserve-button">Reserve</button> <!-- Ensure this line is present -->
                        `;
                        yardListingsDiv.appendChild(yardDiv);
                    }
                });
    
                if (yardListingsDiv.innerHTML === '') {
                    yardListingsDiv.innerHTML = "<p>No yards match your search criteria.</p>";
                }
            }).catch(error => {
                console.error('Error fetching yard listings: ', error);
            });
        }

    // Show/Hide the 'Other' text box when 'Other' is selected
    const otherOption = document.getElementById('other-option');
    const otherTextBox = document.getElementById('other-listing-type');
    const listingTypeRadios = document.getElementsByName('listing-type');

    listingTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (otherOption.checked) {
                otherTextBox.style.display = 'block';  // Show the text box if 'Other' is selected
            } else {
                otherTextBox.style.display = 'none';   // Hide the text box if 'Other' is not selected
            }
        });
    });
});


// Function to open the modal for login or sign-up
function openModal(mode) {
    const authModal = document.getElementById('auth-modal');
    authModal.style.display = 'block';

    // Display the appropriate form based on the mode
    if (mode === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    } else if (mode === 'signup') {
        document.getElementById('signup-form').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
    }
}

// Function to close the modal
function closeModal() {
    const authModal = document.getElementById('auth-modal');
    authModal.style.display = 'none';

    // Hide both forms after closing
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
}

// Function to handle user log out
function logout() {
    firebase.auth().signOut().then(() => {
        alert('Logged out successfully!');
        window.location.reload();  // Reload the page to refresh buttons and listings
    }).catch((error) => {
        console.error('Error logging out: ', error);
    });
}

// Yard Listing Submission
document.addEventListener('DOMContentLoaded', function () {
    const yardForm = document.getElementById('yard-form');
    
    if (yardForm) {
        // Ensure only one event listener is added
        yardForm.removeEventListener('submit', handleYardSubmission); // Remove any previous listener
        yardForm.addEventListener('submit', handleYardSubmission); // Add the event listener
    }

    async function handleYardSubmission(e) {
        e.preventDefault(); // Prevent default form submission behavior

        const yardAddress = document.getElementById('yard-address').value;
        const eventDate = document.getElementById('date-of-event').value;
        const yardPrice = document.getElementById('price').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const listingType = document.querySelector('input[name="listing-type"]:checked').value;
        const listingNote = document.getElementById('listing-note').value;
        const spots = parseInt(document.getElementById('spots').value);

        console.log('Spots Value:', spots);  // Log spots value to ensure it's being captured

        if (isNaN(spots) || spots <= 0) {
            alert('Please enter a valid number of spots.');
            return;
        }

        const user = firebase.auth().currentUser;

        if (user) {
            // Call getCoordinates() to fetch latitude and longitude for yard address
            const coordinates = await getCoordinates(yardAddress);

            if (!coordinates) {
                alert('Could not geocode the address. Please try again.');
                return;
            }

            // Add the yard listing to Firestore with latitude and longitude
            db.collection('yards').add({
                owner: user.uid,
                address: yardAddress,
                eventDate: eventDate,
                price: yardPrice,
                startTime: startTime,
                endTime: endTime,
                listingType: listingType,
                listingNote: listingNote,
                spots: spots,
                location: {
                    lat: coordinates.lat,
                    lng: coordinates.lng
                } // Store geocoded coordinates
            })
            .then(() => {
                alert('Yard listed successfully.');
                yardForm.reset(); // Reset the form after successful submission
            })
            .catch(error => {
                console.error('Error listing yard:', error);
            });
        } else {
            alert('You must be logged in to list a yard.');
        }
    }
});


    // Example usage: Open the modal with a specific yard ID
    const openModalBtn = document.getElementById('open-modal-btn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', function() {
            openReservationModal('example-yard-id');
        });
    }

    // Fetch and display the yard listings
    db.collection('yards').get().then((querySnapshot) => {
        const yardListings = document.getElementById('yard-listings');
        yardListings.innerHTML = ''; // Clear existing listings

        querySnapshot.forEach((doc) => {
            const yardData = doc.data();
            const yardId = doc.id;

            // Create a div for each yard listing
            const yardDiv = document.createElement('div');
            yardDiv.classList.add('yard-listing');

            // Populate the yard details and add a Reserve button
            yardDiv.innerHTML = `
                <h3>Yard Address: ${yardData.address}</h3>
                <p>Available Spots: ${yardData.spots}</p>
                <button onclick="openReservationModal('${yardId}')">Reserve</button>
            `;

            // Add the yard listing to the page
            yardListings.appendChild(yardDiv);
        });
    }).catch((error) => {
        console.error('Error fetching yards: ', error);
    });
    
    document.addEventListener('DOMContentLoaded', function () {
        const filterButton = document.getElementById('apply-filters');
        
        if (filterButton) {
            filterButton.addEventListener('click', function () {
                // Get filter values
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;
                const startTime = document.getElementById('start-time').value;
                const endTime = document.getElementById('end-time').value;
                const minSpots = parseInt(document.getElementById('min-spots').value);
                const maxSpots = parseInt(document.getElementById('max-spots').value);
                const minPrice = parseFloat(document.getElementById('min-price').value);
                const maxPrice = parseFloat(document.getElementById('max-price').value);
                const locationAddress = document.getElementById('location-address').value;
                const maxDistance = parseFloat(document.getElementById('max-distance').value);
    
                // Call the function to filter and display yards
                filterAndDisplayYardListings(startDate, endDate, startTime, endTime, minSpots, maxSpots, minPrice, maxPrice, locationAddress, maxDistance);
            });
        }
    
        displayYardListings(); // Display all listings initially
    });

    // Listen for authentication state changes
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is logged in, display yard listings with Reserve button
            db.collection('yards').get().then((querySnapshot) => {
                const yardListings = document.getElementById('yard-listings');
                yardListings.innerHTML = ''; // Clear any previous listings

                querySnapshot.forEach((doc) => {
                    const yardData = doc.data();
                    const yardId = doc.id;

                    // Create a div for each yard listing
                    const yardDiv = document.createElement('div');
                    yardDiv.classList.add('yard-listing');

                    // Populate the yard details and add a Reserve button
                    yardDiv.innerHTML = `
                        <h3>Yard Address: ${yardData.address}</h3>
                        <p>Available Spots: ${yardData.spots}</p>
                        <button onclick="openReservationModal('${yardId}')">Reserve</button>
                    `;

                    // Add the yard listing to the page
                    yardListings.appendChild(yardDiv);
                });
            }).catch((error) => {
                console.error('Error fetching yards: ', error);
            });
        } else {
            // User is not logged in, show a message prompting to log in
            const yardListings = document.getElementById('yard-listings');
            yardListings.innerHTML = '<p>You must log in to see available yards and reserve a spot.</p>';
        }

        
    });

    // Function to open the reservation modal
    function openReservationModal(yardId) {
        const modal = document.getElementById('reservation-modal');
        modal.style.display = 'block';

        // Store the yardId in a data attribute on the form
        const reserveForm = document.getElementById('reserve-form');
        reserveForm.dataset.yardId = yardId; // Attach the yardId to the form

        // Attach the form event listener here to prevent multiple listeners
        reserveForm.onsubmit = function (e) {
            e.preventDefault(); // Prevent form from refreshing

            console.log("Form submission intercepted."); // Debugging line

            const spotsToReserve = parseInt(document.getElementById('reserve-spots').value); // Number of spots to reserve
            const yardId = reserveForm.dataset.yardId; // Get yardId from data attribute

            // Call the function to reserve the spot
            reserveSpot(yardId, spotsToReserve);
        };
    }

    // Function to close the reservation modal
    function closeReservationModal() {
        const modal = document.getElementById('reservation-modal');
        modal.style.display = 'none';
    }

    function reserveSpot(yardId, spotsToReserve) {
        const yardRef = db.collection('yards').doc(yardId);
        
        yardRef.get().then(async (doc) => {
            if (doc.exists) {
                const yardData = doc.data();
                const availableSpots = yardData.spots;
    
                if (availableSpots >= spotsToReserve) {
                    const updatedSpots = availableSpots - spotsToReserve;
    
                    // Fetch the owner's payment methods
                    const ownerRef = db.collection('users').doc(yardData.owner);
                    const ownerDoc = await ownerRef.get();
                    if (ownerDoc.exists) {
                        const ownerData = ownerDoc.data();
                        const paymentMethods = ownerData.paymentMethods || [];
    
                        let paymentMessage = 'Must pay owner of parking place. Owner accepts these methods of payment:\n';
                        paymentMethods.forEach(pm => {
                            paymentMessage += `${pm.method}: ${pm.username}\n`;
                        });
    
                        alert(paymentMessage); // Display the payment methods
    
                        // Proceed with reservation update
                        return yardRef.update({
                            spots: updatedSpots
                        }).then(() => {
                            alert('Reservation successful!');
                            closeReservationModal();
                            displayYardListings();
                        });
                    }
                } else {
                    alert('Not enough spots available!');
                }
            } else {
                console.error('Yard not found!');
            }
        }).catch(error => {
            console.error('Error updating spots:', error);
        });
    }

    function displayYardListings() {
        db.collection('yards').get().then((querySnapshot) => {
            const yardListingsDiv = document.getElementById('yard-listings');
            yardListingsDiv.innerHTML = ''; // Clear any previous listings
    
            querySnapshot.forEach((doc) => {
                const yard = doc.data();
                const yardId = doc.id; // Unique ID for each yard
    
                // Only display listings with available spots
                if (yard.spots > 0) {
                    const yardDiv = document.createElement('div');
                    yardDiv.classList.add('yard-listing');
    
                    // Populate yard details and create Reserve button
                    yardDiv.innerHTML = `
                        <h3>Address: ${yard.address}</h3>
                        <p>Price: $${yard.price} per car</p>
                        <p>Date of Event: ${yard.eventDate}</p>
                        <p>Availability: ${yard.startTime} - ${yard.endTime}</p>
                        <p>Available Spots: ${yard.spots}</p>
                        <button onclick="openReservationModal('${yardId}')" class="reserve-button">Reserve</button>
                    `;
    
                    yardListingsDiv.appendChild(yardDiv);
                }
            });
        }).catch((error) => {
            console.error('Error fetching yard listings: ', error);
        });
    }

    // Place the geocoding function here (Step 1 code from earlier)
    async function getCoordinates(address) {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.length > 0) {
                const location = data[0];
                return { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
            } else {
                console.error('Address not found');
                return null;
            }
        } catch (error) {
            console.error('Error with Nominatim API:', error);
            return null;
        }
    }

    // DOMContentLoaded event to ensure the page is fully loaded before interacting with the form
    document.addEventListener('DOMContentLoaded', function () {
        const yardForm = document.getElementById('yard-form');
        if (yardForm) {
            yardForm.addEventListener('submit', async function (e) {
                e.preventDefault();

                const yardAddress = document.getElementById('yard-address').value;
                const eventDate = document.getElementById('date-of-event').value;
                const yardPrice = document.getElementById('price').value;
                const startTime = document.getElementById('start-time').value;
                const endTime = document.getElementById('end-time').value;
                const listingType = document.querySelector('input[name="listing-type"]:checked').value;
                const listingNote = document.getElementById('listing-note').value;
                const spots = parseInt(document.getElementById('spots').value);

                console.log('Spots Value:', spots);

                if (isNaN(spots) || spots <= 0) {
                    alert('Please enter a valid number of spots.');
                    return;
                }

                const user = firebase.auth().currentUser;

                if (user) {
                    // Call getCoordinates() to fetch latitude and longitude for yard address
                    const coordinates = await getCoordinates(yardAddress);

                    if (!coordinates) {
                        alert('Could not geocode the address. Please try again.');
                        return;
                    }

                    // Add the yard listing to Firestore with latitude and longitude
                    db.collection('yards').add({
                        owner: user.uid,
                        address: yardAddress,
                        eventDate: eventDate,
                        price: yardPrice,
                        startTime: startTime,
                        endTime: endTime,
                        listingType: listingType,
                        listingNote: listingNote,
                        spots: spots,
                        location: {
                            lat: coordinates.lat,
                            lng: coordinates.lng
                        } // Store geocoded coordinates
                    })
                    .then(() => {
                        alert('Yard listed successfully.');
                        yardForm.reset();
                    })
                    .catch(error => {
                        console.error('Error listing yard:', error);
                    });
                } else {
                    alert('You must be logged in to list a yard.');
                }
            });
        }
    });

// Hardcoded coordinates for Lane Stadium (Beamer Way)
const beamerWayCoords = {
    lat: 37.229573,
    lng: -80.418376
};

// Haversine formula to calculate the distance between two lat/lng pairs
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance * 0.621371; // Convert to miles
}

// Function to filter and display yards based on the filters applied
function filterAndDisplayYardListings(startDate, endDate, minSpots, maxSpots, minPrice, maxPrice, listingType, maxDistance) {
    db.collection('yards').get().then((querySnapshot) => {
        const yardListingsDiv = document.getElementById('yard-listings');
        yardListingsDiv.innerHTML = ''; // Clear previous listings

        querySnapshot.forEach((doc) => {
            const yard = doc.data();

            // Apply filters
            const isWithinDateRange = (!startDate || !endDate || (yard.eventDate >= startDate && yard.eventDate <= endDate));
            const isWithinSpotsRange = (!minSpots || !maxSpots || (yard.spots >= minSpots && yard.spots <= maxSpots));
            const isWithinPriceRange = (!minPrice || !maxPrice || (yard.price >= minPrice && yard.price <= maxPrice));
            const matchesListingType = (!listingType || yard.listingType === listingType);

            // Calculate distance from Lane Stadium
            const distanceFromStadium = calculateDistance(beamerWayCoords.lat, beamerWayCoords.lng, yard.location.lat, yard.location.lng);
            const isWithinDistance = (!maxDistance || distanceFromStadium <= maxDistance);

            // Only display listings if all filters match
            if (isWithinDateRange && isWithinSpotsRange && isWithinPriceRange && matchesListingType && isWithinDistance) {
                const yardDiv = document.createElement('div');
                yardDiv.classList.add('yard-listing');
                yardDiv.innerHTML = `
                    <h3>Address: ${yard.address}</h3>
                    <p>Price: $${yard.price} per event</p>
                    <p>Available Spots: ${yard.spots}</p>
                    <p>Distance from Lane Stadium: ${distanceFromStadium.toFixed(2)} miles</p>
                    <button onclick="openReservationModal('${doc.id}')" class="reserve-button">Reserve</button>
                `;
                yardListingsDiv.appendChild(yardDiv);
            }
        });

        if (yardListingsDiv.innerHTML === '') {
            yardListingsDiv.innerHTML = "<p>No yards match your search criteria.</p>";
        }
    }).catch((error) => {
        console.error('Error fetching yard listings: ', error);
    });
}

// Event listener for the 'Apply Filters' button
document.getElementById('apply-filters-btn').addEventListener('click', function() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const minSpots = parseInt(document.getElementById('min-spots').value);
    const maxSpots = parseInt(document.getElementById('max-spots').value);
    const minPrice = parseFloat(document.getElementById('min-price').value);
    const maxPrice = parseFloat(document.getElementById('max-price').value);
    const listingType = document.getElementById('listing-type-filter').value;
    const maxDistance = parseFloat(document.getElementById('max-distance').value);

    filterAndDisplayYardListings(startDate, endDate, minSpots, maxSpots, minPrice, maxPrice, listingType, maxDistance);
});