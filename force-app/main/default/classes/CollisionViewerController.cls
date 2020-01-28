public with sharing class CollisionViewerController {

    @AuraEnabled
    public static string updateObjectData(Object1__c obj, DateTime systemModstamp){
        
        String response;
        Object1__c modstampCheck = [select id, systemModstamp, LastModifiedById, LastModifiedBy.Name from Object1__c where id = :obj.Id limit 1 FOR UPDATE ];
        if (modstampCheck.systemModStamp ==  systemModstamp)
        {
            update obj;
            response = 'save success';
        }
        else {
            throw new AuraHandledException('modstamp changed');
        }
        return response;
    }

}
