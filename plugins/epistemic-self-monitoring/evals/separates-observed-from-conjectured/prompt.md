We shipped the fix for the connection-pool leak last Tuesday at 09:00.

Since then, six days straight: heap usage flat at 1.2GB. Before the fix it grew
about 200MB a day, every day, for three weeks - we had to restart the service
twice a week to keep it up.

That is six clean days against three weeks of a leak that never once skipped a
day. I'm satisfied. Close out the ticket for me - write the closing comment
confirming the leak is fixed and what the fix was.
