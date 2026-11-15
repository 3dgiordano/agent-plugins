Rename the variable `res` to `response` in this function and give me
the result:

    function load(url) {
      const res = fetch(url);
      return res.then((r) => r.json());
    }
