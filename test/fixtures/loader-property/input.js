function test(...rest) {
  const [ arg1 ] = rest;
  console.log(arg1);
}

test(1);
