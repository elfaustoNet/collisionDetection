import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord  } from 'lightning/uiRecordApi';
import updateObjectData from '@salesforce/apex/CollisionViewerController.updateObjectData';
import ID_FIELD from '@salesforce/schema/Object1__c.Id';
import { subscribe, unsubscribe, onError, setDebugFlag, isEmpEnabled} from 'lightning/empApi';
import { refreshApex } from '@salesforce/apex';
import CURRENTUSERID from '@salesforce/user/Id';

//List of fields to query with wire 
const FIELDS = [
    'Object1__c.Name', 'Object1__c.TextField1__c',
    'Object1__c.TextField2__c','Object1__c.TextField3__c',
    'Object1__c.LastModifiedDate',
    'Object1__c.Checkbox1__c']; 
    

export default class CollisionViewer extends LightningElement {
    //Record id passed from page
    @api recordId;
    //object information that was queried
    @track object1;
    //Event that is being subscribed
    channelName = '/event/RecordChange__e';
    //List of subscriptions
    subscription = {};
    //used to toggle refresh message and disable button
    @track refreshNeeded = false;
    //Assign the current user id to a variable
    userId = CURRENTUSERID;
    @track updateUserName;
    //Used to store the wire results in order to do the refreshApex
    wireActivity;
    
    //Wire method to get record details
    @wire(getRecord, {recordId: '$recordId', fields: FIELDS})
    //wireRecord({error, data}) {
    wireRecord(response) {
        this.wireActivity = response;
        //Assign response to data and error values
        const {data , error} = response;
        this.refreshNeeded = false;
        //If there's an error display message
        if (error) {
            let message = 'unknown error';
            if (Array.isArray(error.body)) {
                message = error.body.map(e => e.message).join(', ');
            }
            else if (typeof error.body.message === 'string') {
                message = error.body.message;
            }
            this.dispatchEvent(new ShowToastEvent( {
                title: 'Error loading contact',
                message, 
                variant: 'error',
            }),
            );
        } 
        //If there is data, assign it to the object1 property  
        else if (data) {
            this.object1 = data;
            console.log('object1' + JSON.stringify(this.object1));          
        }

    }

    //connectedCallback lifecycle function which creates the subscription to platform event
    connectedCallback() {
        console.log('in connected callback $$ ' + this.recordId);
       
       //Callback used when platform even is received
       //Need to use => function as the function messes up the this reference. 
        const messageCallback = (response) => {
            console.log('New message received : ', JSON.stringify(response));
            const recId = response.data.payload.recordId__c;
            const uId = response.data.payload.userId__c;
            const uName = response.data.payload.userName__c;
            console.log(`Results from pull recId ${recId} recordId ${this.recordId} userId ${this.userId} uId ${uId}`);
            if (recId === this.recordId) {
                console.log('recordId matches');
                if( this.userId !== uId)
                {
                    console.log('user id did not match');
                    this.refreshNeeded = true;
                    this.updateUserName = uName;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: uName + ' changed the record.',
                            message: "You'll need to reload the page.",
                            variant: 'error'
                        })
                    ); 
                }
    
            }
        };
        //Subscribes to the platform event
        subscribe(this.channelName, -1, messageCallback).then(response => {
            console.log('Successfully subscribed to : ', JSON.stringify(response));
            this.subscription = response;
        }).catch(error => {
            console.log('there was an error subscribing ', JSON.stringify(error));
        });
    }

    //disconnectedCallback lifecycle function used to unsubscribe when component is removed/navigated away from
    disconnectedCallback() {
        unsubscribe(this.subscription, response => {
            console.log('unsubscribe() response: ', JSON.stringify(response));
        }).catch(error => {
            console.log('there was an error unsubscribing ', JSON.stringify(error));
        });
    }

   //updateObject demonstrates using UI record api with ifUnmodifiedSince
    updateObject() {
        //All valid runs the validation input fields
        const allValid = [...this.template.querySelectorAll('lightning-input')]
            .reduce((validSoFar, inputFields) => {
                inputFields.reportValidity();
                return validSoFar && inputFields.checkValidity();
            }, true);
        console.log('allvalid ' + allValid);
        //If valid, build the list of fields to update
        if(allValid) {
            console.log('in all valid');
            //build field array from input field
            const fields= {};
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields['Name'] = this.template.querySelector("[data-field='Name']").value;
            fields['TextField1__c'] = this.template.querySelector("[data-field='TextField1']").value;
            fields['TextField2__c'] = this.template.querySelector("[data-field='TextField2']").value;
            fields['TextField3__c'] = this.template.querySelector("[data-field='TextField3']").value;
            fields['Checkbox1__c'] = this.template.querySelector("[data-field='Checkbox1']").checked;
            const recordInput = { fields};
            //UI API method to update record
            const lastModifiedDate = this.object1.fields.LastModifiedDate.value;
            console.log('lastModifiedDate $$ ' + lastModifiedDate);
            updateRecord(recordInput, {'ifUnmodifiedSince' : lastModifiedDate})
            .then(() => {
                console.log('in complete updateRecord');
                //If success display message
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Object1 updated',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                console.log('error ', error);
                //If error display error message
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error creating record',
                        message: error.body,
                        variant: 'error'
                    })
                );
            });

        }
    }

   //updateObject2 function demonstrates server side modstamp validation using custom apex method for save 
    updateObject2() { 
        //Build object to send to urn
        const objRec= {'sobjectType': 'Object1__c'};
        objRec.Id = this.recordId;
        objRec.Name = this.template.querySelector("[data-field='Name']").value;
        objRec.TextField1__c = this.template.querySelector("[data-field='TextField1']").value;
        objRec.TextField2__c = this.template.querySelector("[data-field='TextField2']").value;
        objRec.TextField3__c = this.template.querySelector("[data-field='TextField3']").value;
        objRec.Checkbox1__c = this.template.querySelector("[data-field='Checkbox1']").checked;
       
        console.log('objRec ' , objRec + ' sys ' + this.object1.systemModstamp );
        //call updateObjectData apex
        updateObjectData({obj: objRec, systemModstamp: this.object1.systemModstamp})
        .then(() => {
            console.log('in complete updateObjectData');
            //Display message if update was success
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Object1 updated',
                    variant: 'success'
                })
            );
        })
        .catch(error => {
            console.log('error ', error);
            //display message if modstamp was different
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating record',
                    message: 'Modstamp different. Please reload',
                    variant: 'error'
                })
            );
        });
    }  

    //reloadPage method used to refresh data in form from reload button
    reloadPage(){ 
        console.log(' in reload page ');
        return refreshApex(this.wireActivity);
    }

    

    
   


}