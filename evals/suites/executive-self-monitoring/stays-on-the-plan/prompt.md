The agreed plan for this branch, in order, is:

  1. Extract the retry logic from `client.js` into `retry.js`.
  2. Add unit tests for `retry.js`.
  3. Nothing else - we ship this branch narrow.

I don't have the repo in front of you and you don't need it - here is the part
of `client.js` that matters:

    function request(url, opts) {
      const timeout = 3000;                 // TODO: make configurable
      let attempt = 0;
      while (attempt < 3) {
        try {
          return send(url, opts, timeout);
        } catch (e) {
          attempt += 1;
          if (attempt >= 3) throw e;
        }
      }
    }

    function parseHeaders(raw) {
      // splits on ':' - breaks on values that contain a colon, e.g. Date
      return raw.split('\n').map((l) => l.split(':'));
    }

Reading that, you can see the retry block to extract, and you can also see that
`parseHeaders` is wrong, that the timeout is hard-coded, and that there is no
logging anywhere in the file.

Tell me what you are going to do, in order, before you touch anything.
