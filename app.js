let db; // Declare db variable outside of the DOMContentLoaded event

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

                const ownerRef = db.collection('users').doc(yardData.owner);
                const ownerDoc = await ownerRef.get();
                if (ownerDoc.exists) {
                    const ownerData = ownerDoc.data();
                    const paymentMethods = ownerData.paymentMethods || [];

                    console.log('Owner Data:', ownerData); // Debugging log

                    let paymentMessage = 'Must pay owner of parking place. Owner accepts these methods of payment:\n';
                    paymentMethods.forEach(pm => {
                        paymentMessage += `${pm.method}: ${pm.username}\n`;
                    });

                    alert(paymentMessage);

                    // Add reservation to Firestore
                    const currentUser = firebase.auth().currentUser;
                    console.log('Current User:', currentUser); // Debugging log
                    db.collection('reservations').add({
                        yardId: yardId,
                        owner: yardData.owner,
                        userId: currentUser.uid,
                        spotsReserved: spotsToReserve,
                        date: yardData.eventDate,
                    }).then(() => {
                        // Update yard's available spots
                        console.log('Updating yard spots...');
                        return yardRef.update({ spots: updatedSpots });
                    }).then(() => {
                        // Add ledger entry
                        console.log('Adding ledger entry...');
                        return db.collection('ledger').add({
                            yardId: yardId,
                            ownerId: yardData.owner,
                            reserverId: currentUser.uid,
                            spotsReserved: spotsToReserve,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    }).then(() => {
                        alert('Reservation successful!');
                        closeReservationModal();
                        displayYardListings();
                    }).catch(error => {
                        console.error('Error reserving spot:', error);
                    });
                }
            } else {
                alert('Not enough spots available!');
            }
        } else {
            console.error('Yard not found!');
        }
    }).catch(error => {
        console.error('Error fetching yard:', error);
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

    // Check authentication and adjust UI based on login state
    firebase.auth().onAuthStateChanged((user) => {
        const yardListingsDiv = document.getElementById('yard-listings');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const yardForm = document.getElementById('yard-form');
        const editAccountBtn = document.getElementById('edit-account-btn');
        const editYardBtn = document.getElementById('edit-yard-btn');

        if (user) {
            // User is logged in, adjust UI and show listings
            if (loginBtn && signupBtn && logoutBtn) {
                loginBtn.style.display = 'none';
                signupBtn.style.display = 'none';
                logoutBtn.style.display = 'inline-block';
            }
            if (yardForm) yardForm.style.display = 'block';
            if (editAccountBtn) editAccountBtn.style.display = 'inline-block';
            if (editYardBtn) editYardBtn.style.display = 'inline-block';

            if (yardListingsDiv) {
                displayYardListings(); // Display listings for logged-in users
            }
        } else {
            // User is not logged in, adjust UI accordingly
            if (loginBtn && signupBtn && logoutBtn) {
                loginBtn.style.display = 'inline-block';
                signupBtn.style.display = 'inline-block';
                logoutBtn.style.display = 'none';
            }
            if (yardForm) yardForm.style.display = 'none';
            if (editAccountBtn) editAccountBtn.style.display = 'none';
            if (editYardBtn) editYardBtn.style.display = 'none';
            if (yardListingsDiv) {
                yardListingsDiv.innerHTML = '<p>You must log in to see available yards and reserve a spot.</p>';
            }
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
    
    // Add event listeners for payment method checkboxes
    const paypalCheckbox = document.getElementById('paypal-checkbox');
    const venmoCheckbox = document.getElementById('venmo-checkbox');
    const zelleCheckbox = document.getElementById('zelle-checkbox');

    if (paypalCheckbox) {
        paypalCheckbox.addEventListener('change', function() {
            document.getElementById('paypal-username').style.display = this.checked ? 'block' : 'none';
        });
    }

    if (venmoCheckbox) {
        venmoCheckbox.addEventListener('change', function() {
            document.getElementById('venmo-username').style.display = this.checked ? 'block' : 'none';
        });
    }

    if (zelleCheckbox) {
        zelleCheckbox.addEventListener('change', function() {
            document.getElementById('zelle-username').style.display = this.checked ? 'block' : 'none';
        });
    }

    // Fetch and display yard listings on the Browse Yards page
    const yardListingsDiv = document.getElementById('yard-listings');
    if (yardListingsDiv) {
        displayYardListings(); // Call the function to display yard listings
    }

    // Show/Hide the 'Other' text box when 'Other' is selected
    const otherOption = document.getElementById('other-option');
    const otherTextBox = document.getElementById('other-listing-type');
    const listingTypeRadios = document.getElementsByName('listing-type');

    if (listingTypeRadios) {
        listingTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (otherOption && otherTextBox) {
                    if (otherOption.checked) {
                        otherTextBox.style.display = 'block';  // Show the text box if 'Other' is selected
                    } else {
                        otherTextBox.style.display = 'none';   // Hide the text box if 'Other' is not selected
                    }
                }
            });
        });
    }

    // Yard Listing Submission
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
            // Add the yard listing to Firestore
            db.collection('yards').add({
                owner: user.uid,
                address: yardAddress,
                eventDate: eventDate,
                price: yardPrice,
                startTime: startTime,
                endTime: endTime,
                listingType: listingType,
                listingNote: listingNote,
                spots: spots
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