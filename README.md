# adidas-alerter
Gives an alert when a tracked adidas product is in stock again.

Features
--------
:white_check_mark: Push notifications  
:white_check_mark: Automatically opens a link when the product is available   
:white_check_mark: Tracked products are being stored  
:white_check_mark: Updates the availability status every minute 

![](http://i.imgur.com/Orvw2Qd.png)

Prerequisites
-------------

[<img src="https://nodejs.org/static/apple-touch-icon.png" align="top" height="35px">](http://nodejs.org)

Tip for Windows users:  [cmder](http://cmder.net/) is a great replacement for the Windows Command Prompt. 

How?
--------
1. Clone or download this repository
2. Open a terminal window and with the terminal, go to the directory where app.js is located
```
$ cd adidas-alerter 
```
3. Install npm dependencies (important):
```
$ npm install 
```
4. Run the script :

Example usage: 
```
$ node app.js NL BA8922 "43 1/3"
```
The product with product-id "BA8922" and size "43 1/3" on adidas.nl will be added to the list of products that are being tracked.

```
$ node app.js
```
Will just check all the products that are being tracked.

Available regions: 
* US (adidas.com)
* CA (adidas.ca)
* AU (adidas.com.au)
* UK (adidas.co.uk) 
* DE (adidas.de)
* NL (adidas.nl)

The sizes of the following regions won't be properly displayed yet: US, CA, AU, UK

Note: As of now, this has only been tested with shoes.

Todo
--------
:x: Sizes for US, CA, AU, UK  
:x: Execute silently (in background)  
:x: Improve command line arguments  
:x: Make it even easier to add products to tracking  
:x: Let the user manage a list  

