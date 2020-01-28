#!/bin/bash

#uncomment if you want to create org 
#sfdx force:org:create -d 25 -f ./config/project-scratch-def.json -w 5 -a collisionDetection -s

#pushes codes to org
sfdx force:source:push

#Assign permission set
sfdx force:user:permset:assign -n CollisionDetection


sfdx force:data:tree:import -p ./data/Plan.json