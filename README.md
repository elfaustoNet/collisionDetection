# Collision Detection

This repository is an example on providing collision detection functionality on custom Lightning Web Components. 
To understand the full scenario of why this is needed and the pattern, read this [blog post]()


## Installation
1. To install this application into scratch org, you can execute the orgInit.sh script from the scripts file.  This will create scratch org (if uncomment and make sure use the -s), migrate code, assign permission set, install one sample record. 
2. Log into org and create a second user, assigning them the CollisionDetection permission set. 


## Testing
To replicate the collision detection, log into as both users you created. Both users should navigate to the same Object1 record page. One user should chnage the record and click update. The second user will see a toast error and embedded warning. The second user can click reload in the warning banner, which will refresh the data and allow them to save their changes. 
