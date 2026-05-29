
//==========================================
// Step up
//=========================================

// Import the Express module (Toolbox)
const express = require('express');

// Create an Express application
const app = express();

// Set up the EJS template view engine framework - translate EJS files into standard HTML pages for the user's browser
app.set('view engine', 'ejs');

// It tells your Express server to automatically serve static files, such as images or CSS stylesheets, 
// directly from a designated folder named "public" to the user's browser.
app.use(express.static('public'));

// Acts as a translator, parsing raw incoming form data from POST requests into a structured JavaScript object so your 
// Express server can easily read and process it
app.use(express.urlencoded({ extended: true }));

// Define the port number for the server to listen on
const port = 3000; 

// Monthly budget set for the expense tracker
let startingBudget = 3000.00;

//==========================================
// Data Storage
//========================================== 
// Defined in-memory data structure to hold all expense entries
let portfolio = [];

// Track realized profit/loss from completed sells
let realizedProfitLoss = 0;

// Assign initial value for expense item ID, subsequent entries will increment this value to ensure each new entry gets a unique id
let nextId = 1; 


// ==========================================
// ROUTES SYSTEM CONTROLLER
// ==========================================


// 1. CREATE - Add new expense entry to the system

// Define route for displaying the Add Expense Entry form, triggered by the "Add Expense" button on the dashboard. 
app.get('/add', (req, res) => {
    res.render('add');
});

// Define route for processing Add Expense Entry form submission, triggered when the user clicks the "Save Expense" button on the Add Expense form. 
app.post('/add', (req, res) => {
    const quantity = parseInt(req.body.quantity);
    const unitPrice = parseFloat(req.body.unitPrice);
    const commission = parseFloat(req.body.commission);
    const totalCost = quantity * unitPrice + commission;

    const newInvestment = {
        id: nextId++, // assign unique ID and increments it up by 1
        tradeType: req.body.tradeType,
        Symbol: req.body.symbol,
        quantity: quantity,
        unitPrice: unitPrice,
        commission: commission,
        totalCost: totalCost,
        date: req.body.date
    };
    
    portfolio.push(newInvestment);
    res.redirect('/');
});



// Define route to show the Sell form for a Buy transaction.
app.get('/sell/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let foundInvestment = null;

    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].id === id) {
            foundInvestment = portfolio[i];
            break;
        }
    }

    if (!foundInvestment) {
        return res.redirect('/');
    }

    res.render('sell', { investment: foundInvestment, id: id });
});

// Define route to process the Sell form submission.
app.post('/sell/:id', (req, res) => {
    const originalId = parseInt(req.params.id);
    const originalInvestment = portfolio.find(item => item.id === originalId);

    if (!originalInvestment) {
        return res.redirect('/');
    }

    const quantity = parseInt(req.body.quantity);
    const unitPrice = parseFloat(req.body.unitPrice);
    const commission = parseFloat(req.body.commission);
    const sellTotalCost = quantity * unitPrice - commission;

    const buyCommissionShare = originalInvestment.quantity > 0
        ? originalInvestment.commission * (quantity / originalInvestment.quantity)
        : 0;
    const buyBasis = originalInvestment.unitPrice * quantity + buyCommissionShare;
    const realized = sellTotalCost - buyBasis;
    realizedProfitLoss += realized;

    portfolio = portfolio.filter(item => item.id !== originalId);
    res.redirect('/');
});


// 2. READ - Display all investment entries and budget summary on the dashboard

// Define route for Dashboard (index.ejs), triggered when the user is at the homepage (/)
app.get('/', (req, res) => {
    let totalInvested = 0;

    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].tradeType === 'Buy') {
            totalInvested += portfolio[i].quantity * portfolio[i].unitPrice + portfolio[i].commission;
        }
    }
    
    const loss = startingBudget - totalInvested;
    
    res.render('index', {       
        portfolio: portfolio,
        totalInvested: totalInvested,
        loss: loss,
        realizedProfitLoss: realizedProfitLoss
    });
});




// 3. UPDATE - Edit existing investment entry

// Define route to show edit form for a specific investment entry, triggered by the edit button.
app.get('/edit/:id', (req, res) => {
    const id = parseInt(req.params.id); 
    let foundInvestment = null;
    
    // Search loop to search the item containing the permanent ID key
    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].id === id) {
            foundInvestment = portfolio[i];
            break; // Match located, exit search loop safely
        }
    }
    
    res.render('edit', { investment: foundInvestment, id: id });
});

// Define route to process the edit form submission and update the specific investment entry
app.post('/edit/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    // Loop to find the specific investment entry in the portfolio list that matches the provided ID, then update its properties with the new values submitted through the edit form
    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].id === id) {
            portfolio[i].tradeType = req.body.tradeType;
            portfolio[i].Symbol = req.body.symbol;
            portfolio[i].quantity = parseInt(req.body.quantity);
            portfolio[i].unitPrice = parseFloat(req.body.unitPrice);
            portfolio[i].commission = parseFloat(req.body.commission);
            portfolio[i].totalCost = portfolio[i].quantity * portfolio[i].unitPrice + portfolio[i].commission;
            portfolio[i].date = req.body.date;
            break;
        }
    }
    res.redirect('/');
});





// 4. DELETE - Remove an existing investment entry

// Define route to handle deletion of a specific investment entry, triggered by the delete button in the Actions column of the investments table
app.get('/delete/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    for (let i = 0; i < portfolio.length; i++) {
        if (portfolio[i].id === id) {
            portfolio.splice(i, 1);
            break;
        }
    }
    res.redirect('/');
});



// 5. RESET - Clear all investment entries

// Define route to handle clearing the entire investment items, triggered by the reset button. This will clear all recorded investments and reset the ID counter.
app.get('/reset', (req, res) => {
    portfolio = []; // Clear out the array memory completely
    realizedProfitLoss = 0;
    nextId = 1;    // Reset the ID counter back to sequence start
    res.redirect('/');
});


// Define route to process the new budget value submitted by user through the budget pop up form. 
app.post('/set-budget', (req, res) => {
    const newBudget = parseFloat(req.body.budgetAmount);
    
    // Validate if the converted number is valid before updating memory
    if (!isNaN(newBudget) && newBudget >= 0) {
        startingBudget = newBudget;
    }
    
    // Redirect back to dashboard to see updated summary cards
    res.redirect('/');
});

// Port activation gates
app.listen(port, () => {
    console.log(`Server running safely at http://localhost:${port}`);
});