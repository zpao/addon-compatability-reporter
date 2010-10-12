#!/bin/sh

[ -f acr.xpi ] && rm acr.xpi;
[ -f chrome/acr.jar ] && rm chrome/acr.jar;
cd chrome
zip -r0 acr.jar content locale skin -x \*.svn/* -x \*.zip -x \*.db -x \*.xcf -x \*.\*~ -x \*.DS_Store -x \*.swp;
cd ..
zip -r9 acr.xpi chrome.manifest install.rdf defaults/ chrome/acr.jar components/ -x \*.svn/* -x \*.DS_Store -x \*.swp;
printf "ACR build finished.\n";
